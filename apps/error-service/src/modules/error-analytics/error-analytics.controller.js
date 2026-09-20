import * as errorAnalyticsService from "./error-analytics.service.js";

/**
 * GET /error-analytics
 * Get aggregated error analytics data for charts
 */
export async function getErrorAnalytics(req, res, next) {
  try {
    const data = await errorAnalyticsService.getErrorAnalyticsData(req.query);
    res.status(200).json({
      success: true,
      message: "Data analitik error berhasil diambil",
      data,
    });
  } catch (error) {
    next(error);
  }
}
