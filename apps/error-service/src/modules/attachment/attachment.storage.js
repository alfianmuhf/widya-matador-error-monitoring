import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import createError from "http-errors";
import { env } from "../../config/env.js";

/**
 * RustFS (and any S3-compatible store) client.
 * Only bucket-relative keys are used; provider details never reach the database.
 */

let client = null;

export const isConfigured = () =>
  Boolean(env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY && env.S3_SECRET_KEY);

const getClient = () => {
  if (!isConfigured()) {
    throw createError(503, "Penyimpanan lampiran belum dikonfigurasi");
  }

  if (!client) {
    client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION || "us-east-1",
      // RustFS, MinIO, dan SeaweedFS hanya mendukung path-style
      forcePathStyle: (env.S3_FORCE_PATH_STYLE || "true") !== "false",
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
      // R2 menolak checksum default SDK v3 terbaru; provider lain mengabaikan
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  return client;
};

export const putObject = async (key, body, contentType) => {
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
};

export const getObject = async (key) => {
  return getClient().send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    })
  );
};

export const deleteObject = async (key) => {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    })
  );
};

/**
 * Used by the orphan cleanup script only. Returns metadata so the caller can
 * skip objects that an in-flight upload has written but not yet recorded.
 */
export const listObjects = async (prefix = "") => {
  const s3 = getClient();
  const objects = [];
  let token;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: env.S3_BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
      })
    );

    for (const item of page.Contents || []) {
      if (item.Key) objects.push({ key: item.Key, lastModified: item.LastModified });
    }

    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  return objects;
};
