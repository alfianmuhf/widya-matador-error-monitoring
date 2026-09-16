import * as userService from "./user.service.js";

/**
 * Controller: Admin creates a new user
 */
export const createUser = async (req, res, next) => {
  try {
    const adminId = req.user?.id;
    const { user, initialPassword } = await userService.createUser(req.body, adminId);

    res.status(201).json({
      success: true,
      message: "Pengguna baru berhasil didaftarkan",
      data: {
        user,
        initialPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get list of users with pagination and filtering
 */
export const getUsers = async (req, res, next) => {
  try {
    const result = await userService.getUsers(req.query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get single user detail by ID
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
