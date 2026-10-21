import express from "express";

import { createExpense } from "../controllers/expense.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { validateObjectId } from "../middleware/validateObjectId.middleware.js";

const router = express.Router();

router.post(
  "/:groupId/expenses",
  protect,
  validateObjectId("groupId"),
  createExpense,
);

export default router;
