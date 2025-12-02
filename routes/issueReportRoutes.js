// routes/issueReportRoutes.js
const express = require("express");
const router = express.Router();
const IssueReport = require("../models/IssueReport");
const { authenticateToken, requireRole } = require("../middleware/auth");

// CREATE issue (customer)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { subject, title, description } = req.body;
    const issue = new IssueReport({
      title: title || subject,
      description: description,

      customer: req.user.id,
    });

    await issue.save();
    res.status(201).json(issue);
  } catch (err) {
    console.error("Issue Submit Error:", err); // Log specific error to console for debugging
    res
      .status(400)
      .json({ message: "Error submitting issue", error: err.message });
  }
});

// GET all issues (admin)
router.get("/", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const issues = await IssueReport.find().populate("user");
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: "Error fetching issues" });
  }
});

// GET my issues (customer)
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const issues = await IssueReport.find({ user: req.user.id });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: "Error fetching your issues" });
  }
});

// UPDATE issue status (admin)
router.put(
  "/:id/status",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const issue = await IssueReport.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
      );
      res.json(issue);
    } catch (err) {
      res.status(400).json({ message: "Error updating issue status" });
    }
  }
);

router.delete(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      await IssueReport.findByIdAndDelete(req.params.id);
      res.json({ message: "Issue deleted" });
    } catch {
      res.status(500).json({ error: "Could not delete issue" });
    }
  }
);

module.exports = router;
