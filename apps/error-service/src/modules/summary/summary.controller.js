import * as summaryService from "./summary.service.js";

/**
 * GET /summary or /ringkasan
 * Get aggregated dashboard summary metrics and charts
 */
export async function getSummary(req, res, next) {
  try {
    const data = await summaryService.getSummaryData(req.query);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Failed to get summary data:", err);
    next(err);
  }
}
