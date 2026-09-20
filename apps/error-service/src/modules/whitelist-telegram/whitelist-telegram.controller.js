import * as telegramService from "./whitelist-telegram.service.js";

/**
 * Controller: Admin adds user to Telegram whitelist
 */
export const createTelegramUser = async (req, res, next) => {
  try {
    const telegramUser = await telegramService.createTelegramUser(req.body, req.user);

    res.status(201).json({
      success: true,
      message: "User Telegram berhasil ditambahkan ke whitelist",
      data: { telegramUser },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Admin gets list of whitelisted Telegram users
 */
export const getTelegramUsers = async (req, res, next) => {
  try {
    const result = await telegramService.getTelegramUsers(req.query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Admin gets detail of a whitelisted Telegram user
 */
export const getTelegramUserById = async (req, res, next) => {
  try {
    const telegramUser = await telegramService.getTelegramUserById(req.params.id);

    res.status(200).json({
      success: true,
      data: { telegramUser },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Admin updates Telegram user (e.g. status isActive)
 */
export const updateTelegramUser = async (req, res, next) => {
  try {
    const telegramUser = await telegramService.updateTelegramUser(req.params.id, req.body, req.user);

    res.status(200).json({
      success: true,
      message: "Data user Telegram berhasil diperbarui",
      data: { telegramUser },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Admin deletes Telegram user from whitelist
 */
export const deleteTelegramUser = async (req, res, next) => {
  try {
    const result = await telegramService.deleteTelegramUser(req.params.id, req.user);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
