// src/controllers/studentController.js
import User from "../models/User.js";
import Allocation from "../models/Allocation.js";
import Room from "../models/Room.js";

export const getProfile = async (req, res) => {
  try {
    const { studentId } = req.params;

    // allow students to fetch their own profile or admins
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId)
      return res.status(403).json({ message: "Forbidden" });

    const user = await User.findById(studentId).select("-password");
    if (!user) return res.status(404).json({ message: "Student not found" });

    const allocation = await Allocation.findOne({ student: studentId })
      .populate({
        path: "room",
        populate: { path: "hostel", model: "Hostel" },
      })
      .lean();

    return res.json({
      personal: user,
      allocation: allocation
        ? {
            status: allocation.status,
            hostel: allocation.room?.hostel?.name,
            hostelId: allocation.room?.hostel?._id,
            roomNumber: allocation.room?.roomNumber,
            allocatedAt: allocation.allocatedAt,
          }
        : null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId)
      return res.status(403).json({ message: "Forbidden" });

    const updates = req.body;
    delete updates.role;
    delete updates.password;

    const updated = await User.findByIdAndUpdate(studentId, updates, { new: true }).select("-password");
    if (!updated) return res.status(404).json({ message: "Student not found" });
    return res.json({ status: "updated", user: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

// avatar upload handler (expects multer has run and put file on req.file)
export const uploadAvatar = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId)
      return res.status(403).json({ message: "Forbidden" });

    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // For demo: store file.path in profilePic (you may want cloud storage)
    const profilePicPath = `/${req.file.path.replace(/\\/g, "/")}`;

    const updated = await User.findByIdAndUpdate(studentId, { profilePic: profilePicPath }, { new: true }).select(
      "-password"
    );

    return res.json({ status: "success", profilePic: profilePicPath, user: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

export const getRoommate = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user._id.toString() !== studentId)
      return res.status(403).json({ message: "Forbidden" });

    const allocation = await Allocation.findOne({ student: studentId, status: "approved" }).populate("room");
    if (!allocation) return res.status(404).json({ message: "No active allocation found for student" });

    // find a different allocation in the same room
    const roommateAlloc = await Allocation.findOne({
      room: allocation.room._id,
      student: { $ne: studentId },
      status: "approved",
    }).populate("student", "fullName matricNumber");

    if (!roommateAlloc) return res.json({ message: "No roommate assigned yet" });

    return res.json({
      id: roommateAlloc.student._id,
      name: roommateAlloc.student.fullName,
      personality: roommateAlloc.student.personality || null,
      compatibility: { score: 88, matchingTraits: [] }, // placeholder: implement actual matching logic if you want
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};
