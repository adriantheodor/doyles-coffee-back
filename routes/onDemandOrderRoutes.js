const express = require('express');
const router = express.Router();
const OnDemandOrder = require('../models/OnDemandOrder');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createUpdateLimiter } = require('../middleware/rateLimiter');
const { sendEmail } = require('../utils/sendEmail');

const adminRecipients = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || 'admin@doyles.com')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);

const getDateValidationErrors = (fieldName, value) => {
  const errors = [];

  if (value === undefined || value === null || value === '') {
    return errors;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    errors.push(`${fieldName} must be a valid date`);
    return errors;
  }

  const now = new Date();
  const minimumAllowedDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  if (parsedDate < minimumAllowedDate) {
    errors.push(`${fieldName} must be at least 48 hours from the current server time`);
  }

  if (parsedDate.getDay() === 0 || parsedDate.getDay() === 6) {
    errors.push(`${fieldName} cannot be Saturday or Sunday`);
  }

  return errors;
};

router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const orders = await OnDemandOrder.find().sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    console.error('ON DEMAND ORDER FETCH ERROR:', error);
    return res.status(500).json({ message: 'Error fetching on-demand orders' });
  }
});

router.post('/', createUpdateLimiter, async (req, res) => {
  try {
    const { companyName, jugCount, deliveryDate, notes } = req.body;
    const errors = [];

    if (!companyName || typeof companyName !== 'string' || companyName.trim().length === 0) {
      errors.push('companyName is required');
    }

    if (jugCount !== undefined && jugCount !== null) {
      if (!Number.isInteger(jugCount) || jugCount <= 0) {
        errors.push('jugCount must be a positive integer when provided');
      }
    }

    const hasDeliveryDate = deliveryDate !== undefined && deliveryDate !== null && deliveryDate !== '';

    if (!hasDeliveryDate) {
      errors.push('deliveryDate is required');
    }

    if (hasDeliveryDate) {
      errors.push(...getDateValidationErrors('deliveryDate', deliveryDate));
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors,
      });
    }

    const parsedDeliveryDate = hasDeliveryDate ? new Date(deliveryDate) : undefined;

    const onDemandOrder = new OnDemandOrder({
      companyName: companyName.trim(),
      jugCount: jugCount ?? undefined,
      deliveryDate: parsedDeliveryDate,
      requestedDate: parsedDeliveryDate,
      notes: typeof notes === 'string' ? notes : '',
    });

    await onDemandOrder.save();

    try {
      const deliveryDateText = parsedDeliveryDate ? new Date(parsedDeliveryDate).toLocaleString() : 'Not provided';
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>New On-Demand Order Submitted</h2>
          <p><strong>Company:</strong> ${onDemandOrder.companyName}</p>
          <p><strong>Jug Count:</strong> ${onDemandOrder.jugCount ?? 'Not provided'}</p>
          <p><strong>Delivery Date:</strong> ${deliveryDateText}</p>
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          <p><strong>Requested At:</strong> ${new Date(onDemandOrder.createdAt).toLocaleString()}</p>
        </div>
      `;

      await sendEmail({
        to: adminRecipients,
        subject: 'New On-Demand Order Submitted',
        html,
      });
    } catch (emailError) {
      console.error('Failed to send on-demand order notification:', emailError);
    }

    return res.status(201).json(onDemandOrder);
  } catch (error) {
    console.error('ON DEMAND ORDER CREATE ERROR:', error);

    if (error && error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((validationError) => validationError.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    return res.status(400).json({ message: 'Error creating on-demand order', error: error.message });
  }
});

module.exports = router;
