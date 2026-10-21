import mongoose from "mongoose";

import Expense from "../models/expense.model.js";
import Group from "../models/group.model.js";

export const createExpense = async (req, res) => {
  try {
    const { title, amount, splitType, participants } = req.body;
    const { groupId } = req.params;
    const paidBy = req.user._id;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }
    const isMember = group.members.some((member) =>
      member.equals(req.user._id),
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to create expense in this group",
      });
    }
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required and must be a string",
      });
    }
    const cleanTitle = title.trim();
    if (cleanTitle.length > 30 || cleanTitle.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Title not within the limits",
      });
    }
    if (amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "Amount is required",
      });
    }
    if (typeof amount != "number" || !Number.isFinite(amount)) {
      return res.status(400).json({
        success: false,
        message: "Amount should be a number",
      });
    }
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount should be greater than 0",
      });
    }
    if (Math.round(amount * 100) !== amount * 100) {
      return res.status(400).json({
        success: false,
        message: "Amount can have at most 2 decimal places",
      });
    }
    if (!splitType) {
      return res.status(400).json({
        success: false,
        message: "Split Type is required",
      });
    }
    if (splitType !== "equal") {
      return res.status(400).json({
        success: false,
        message: "Unsupported type of split",
      });
    }
    if (!participants) {
      return res.status(400).json({
        success: false,
        message: "Participants required",
      });
    }
    if (!Array.isArray(participants)) {
      return res.status(400).json({
        success: false,
        message: "Participants should be an array",
      });
    }
    if (participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Participants should contain at least 1 participant",
      });
    }
    const uniqueParticipants = new Set(participants);
    if (participants.length !== uniqueParticipants.size) {
      return res.status(400).json({
        success: false,
        message: "Duplicate participants are not allowed",
      });
    }

    const areValidIds = participants.every((participant) =>
      mongoose.Types.ObjectId.isValid(participant),
    );
    if (!areValidIds) {
      return res.status(400).json({
        success: false,
        message: "One or more participant IDs are invalid",
      });
    }

    const areAllMembers = participants.every((participant) => {
      return group.members.some((member) => member.equals(participant));
    });
    if (!areAllMembers) {
      return res.status(400).json({
        success: false,
        message:
          "Every participant of the expense should be a member of the group",
      });
    }

    if (participants.length > Math.round(amount * 100)) {
      return res.status(400).json({
        success: false,
        message: "Amount is too small for the number of participants",
      });
    }
    const totalCents = amount * 100;
    const regularShareCents = Math.floor(totalCents / participants.length);
    const remainderCents = totalCents - regularShareCents * participants.length;

    const splitParticipants = [];
    participants.forEach((participant, index) => {
      if (index === participants.length - 1) {
        splitParticipants.push({
          user: participant,
          share: (regularShareCents + remainderCents) / 100,
        });
      } else {
        splitParticipants.push({
          user: participant,
          share: regularShareCents / 100,
        });
      }
    });
    const expense = new Expense({
      title: cleanTitle,
      amount,
      group: groupId,
      paidBy,
      participants: splitParticipants,
      splitType,
    });
    await expense.save();
    return res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: expense,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
