// utils/auditLogger.js
const AuditLog = require("../models/AuditLog");

/**
 * Create an audit log entry
 * @param {Object} options - Audit log options
 * @returns {Promise<Object>} - Created audit log document
 */
async function logAudit({
  userId = null,
  userEmail = null,
  userRole = null,
  action,
  resourceType = null,
  resourceId = null,
  resourceName = null,
  method = null,
  endpoint = null,
  ipAddress = null,
  userAgent = null,
  status = "SUCCESS",
  statusCode = null,
  changes = null,
  errorMessage = null,
  description = null,
} = {}) {
  try {
    const auditLog = new AuditLog({
      userId,
      userEmail,
      userRole,
      action,
      resourceType,
      resourceId,
      resourceName,
      method,
      endpoint,
      ipAddress,
      userAgent,
      status,
      statusCode,
      changes,
      errorMessage,
      description,
    });

    await auditLog.save();
    return auditLog;
  } catch (err) {
    // Log errors but don't crash the app if audit logging fails
    console.error("❌ Error creating audit log:", err.message);
    return null;
  }
}

/**
 * Extract changes between two objects (before/after)
 * @param {Object} before - Original object
 * @param {Object} after - Updated object
 * @returns {Object} - Object containing only changed fields
 */
function extractChanges(before, after) {
  const changes = {
    before: {},
    after: {},
  };

  // Get all keys from both objects
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  for (const key of allKeys) {
    const beforeVal = before?.[key];
    const afterVal = after?.[key];

    // Only include if values differ
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      // Exclude sensitive fields
      if (!["password", "verificationToken"].includes(key)) {
        changes.before[key] = beforeVal;
        changes.after[key] = afterVal;
      }
    }
  }

  return Object.keys(changes.before).length > 0 ? changes : null;
}

/**
 * Get IP address from request
 * @param {Object} req - Express request object
 * @returns {string} - Client IP address
 */
function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    null
  );
}

/**
 * Retrieve audit logs with filtering and pagination
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} - Array of audit logs
 */
async function getAuditLogs(filters = {}) {
  try {
    const {
      userId,
      action,
      resourceType,
      resourceId,
      startDate,
      endDate,
      limit = 100,
      skip = 0,
    } = filters;

    const query = {};

    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;
    if (resourceId) query.resourceId = resourceId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await AuditLog.countDocuments(query);

    return { logs, total };
  } catch (err) {
    console.error("❌ Error retrieving audit logs:", err.message);
    return { logs: [], total: 0 };
  }
}

/**
 * Retrieve user activity history
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - User's audit logs
 */
async function getUserActivity(userId, limit = 50) {
  try {
    const logs = await AuditLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return logs;
  } catch (err) {
    console.error("❌ Error retrieving user activity:", err.message);
    return [];
  }
}

/**
 * Get audit logs for a specific resource
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - Resource ID
 * @returns {Promise<Array>} - Audit logs for the resource
 */
async function getResourceHistory(resourceType, resourceId, limit = 50) {
  try {
    const logs = await AuditLog.find({ resourceType, resourceId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return logs;
  } catch (err) {
    console.error("❌ Error retrieving resource history:", err.message);
    return [];
  }
}

/**
 * Get failed login attempts for an IP or email
 * @param {string} identifier - IP address or email
 * @param {number} minutes - Time window in minutes
 * @returns {Promise<number>} - Count of failed login attempts
 */
async function getFailedLoginAttempts(identifier, minutes = 15) {
  try {
    const timeThreshold = new Date(Date.now() - minutes * 60 * 1000);

    const query = {
      action: "FAILED_LOGIN",
      createdAt: { $gte: timeThreshold },
    };

    // Check if identifier looks like an IP or email
    if (identifier.includes("@")) {
      query.userEmail = identifier;
    } else {
      query.ipAddress = identifier;
    }

    const count = await AuditLog.countDocuments(query);
    return count;
  } catch (err) {
    console.error("❌ Error retrieving failed login attempts:", err.message);
    return 0;
  }
}

/**
 * Bulk delete old audit logs (for cleanup/archival)
 * @param {number} daysToKeep - Days of logs to retain
 * @returns {Promise<number>} - Number of deleted logs
 */
async function deleteOldLogs(daysToKeep = 90) {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await AuditLog.deleteMany({ createdAt: { $lt: cutoffDate } });
    console.log(`✅ Deleted ${result.deletedCount} old audit logs`);
    return result.deletedCount;
  } catch (err) {
    console.error("❌ Error deleting old audit logs:", err.message);
    return 0;
  }
}

module.exports = {
  logAudit,
  extractChanges,
  getClientIp,
  getAuditLogs,
  getUserActivity,
  getResourceHistory,
  getFailedLoginAttempts,
  deleteOldLogs,
};
