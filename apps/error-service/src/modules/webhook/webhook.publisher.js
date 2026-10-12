import amqp from "amqplib";
import { randomUUID } from "node:crypto";
import { recordLog } from "../audit-log/audit-log.service.js";

const QUEUE = "erad.telegram.notify";
const DLX = "erad.telegram.dlx"; // dead-letter exchange untuk pesan poison
const DLQ = "erad.telegram.notify.dlx";

const getExchange = () => process.env.RABBITMQ_EXCHANGE || "erad.events";

let connection = null;
let channel = null;
let opening = null;

const resetConnection = async () => {
  channel = null;
  try {
    await connection?.close();
  } catch {
    /* connection sudah mati, abaikan */
  }
  connection = null;
};

const ensureChannel = async () => {
  const url = process.env.RABBITMQ_URL;
  if (!url) return null;
  if (channel) return channel;
  if (opening) return opening;

  opening = (async () => {
    const conn = await amqp.connect(url);
    conn.on("error", (err) => console.error(`[webhook] RabbitMQ error: ${err.message}`));
    conn.on("close", () => {
      connection = null;
      channel = null;
    });

    const ch = await conn.createConfirmChannel();
    await ch.assertExchange(getExchange(), "topic", { durable: true });
    await ch.assertExchange(DLX, "topic", { durable: true });
    await ch.assertQueue(DLQ, { durable: true });
    await ch.bindQueue(DLQ, DLX, "#");
    await ch.assertQueue(QUEUE, {
      durable: true,
      arguments: { "x-dead-letter-exchange": DLX },
    });
    await ch.bindQueue(QUEUE, getExchange(), "#");

    connection = conn;
    channel = ch;
    return ch;
  })();

  try {
    return await opening;
  } finally {
    opening = null;
  }
};

/**
 * Publish satu event ke bus (fire-and-forget; tidak pernah melempar error).
 * @param {string} routingKey - user.invited | ticket.claimed | ticket.member_added | otp.password_reset
 * @param {object} payload - data event (berisi deliveryId unik + occurredAt)
 * @returns {Promise<boolean>} true bila pesan terkonfirmasi broker
 */
export const publish = async (routingKey, payload = {}) => {
  if (!process.env.RABBITMQ_URL) {
    console.warn(`[webhook] RABBITMQ_URL kosong, event '${routingKey}' dilewati (mode tanpa notifikasi)`);
    return false;
  }

  const deliveryId = randomUUID();
  try {
    const ch = await ensureChannel();
    if (!ch) return false;

    const body = JSON.stringify({
      deliveryId,
      event: routingKey,
      occurredAt: new Date().toISOString(),
      ...payload,
    });

    ch.publish(getExchange(), routingKey, Buffer.from(body), {
      persistent: true,
      contentType: "application/json",
    });
    await ch.waitForConfirms();
    return true;
  } catch (err) {
    console.error(`[webhook] Gagal publish '${routingKey}': ${err.message}`);
    await resetConnection(); // paksa reconnect di percobaan berikutnya
    try {
      // Kegagalan dicatat di audit log (bukan tabel baru, sesuai spec)
      await recordLog({
        actor: "Sistem",
        action: "ERROR",
        entityType: "Webhook",
        entityId: deliveryId,
        details: {
          identifier: routingKey,
          changeSummary: `gagal publish event '${routingKey}' ke RabbitMQ: ${err.message}`,
          routingKey,
          deliveryId,
        },
      });
    } catch {
      /* audit log ikut gagal = sudah cukup dicatat di console */
    }
    return false;
  }
};
