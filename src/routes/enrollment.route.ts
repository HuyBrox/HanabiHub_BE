import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { Enrollment } from "../models/Enrollment";
import Course from "../models/course.model";

const router = Router();

// helper: ép ObjectId -> string
const toId = (v: any) => {
  if (!v) return "";
  if (typeof v === "string") return v;
  try {
    return String(v);
  } catch {
    return "";
  }
};

/**
 * GET /api/v1/enrollments/my
 * Query:
 *  - idsOnly=1   => chỉ trả [{ courseId }]
 *
 * Trả về danh sách khóa học user đã mua/enroll.
 */
router.get("/my", requireAuth, async (req: any, res) => {
  try {
    const userEmail = req.auth?.email;
    if (!userEmail) return res.status(401).json({ message: "Unauthorized" });

    const idsOnly = String(req.query.idsOnly || "") === "1";

    const enrollments = await Enrollment.find({ userEmail })
      .sort({ enrolledAt: -1, createdAt: -1 })
      .lean();

    // ✅ Nhẹ nhất cho FE: chỉ trả courseId
    if (idsOnly) {
      return res.json({
        success: true,
        data: enrollments
          .map((e: any) => ({ courseId: toId(e.courseId) }))
          .filter((x: any) => x.courseId),
      });
    }

    // ✅ Trả đủ enrollment + course
    const courseIds = enrollments
      .map((e: any) => e.courseId)
      .filter(Boolean)
      .map((id: any) => id);

    const courses = await Course.find({ _id: { $in: courseIds } })
      .select(
        "_id title description thumbnail level price instructor lessons students createdAt updatedAt"
      )
      .lean();

    const courseMap = new Map<string, any>();
    for (const c of courses as any[]) {
      courseMap.set(toId(c._id), c);
    }

    const data = (enrollments as any[]).map((e) => {
      const cid = toId(e.courseId);
      return {
        ...e,
        courseId: cid, // ✅ ép string để FE so sánh chuẩn
        course: courseMap.get(cid) || null,
      };
    });

    return res.json({ success: true, data });
  } catch (err) {
    console.error("GET /enrollments/my error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/v1/enrollments/has/:courseId
 * Trả về user hiện tại có access khóa đó không (dựa Enrollment).
 */
router.get("/has/:courseId", requireAuth, async (req: any, res) => {
  try {
    const userEmail = req.auth?.email;
    if (!userEmail) return res.status(401).json({ message: "Unauthorized" });

    const courseId = String(req.params.courseId || "").trim();
    if (!courseId) return res.status(400).json({ message: "Missing courseId" });

    const exists = await Enrollment.exists({ userEmail, courseId });
    return res.json({ success: true, hasAccess: !!exists });
  } catch (err) {
    console.error("GET /enrollments/has/:courseId error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/v1/enrollments/free/:courseId
 * (tuỳ chọn) Cho phép enroll khóa miễn phí.
 * Nếu bạn không cần thì có thể bỏ route này.
 */
router.post("/free/:courseId", requireAuth, async (req: any, res) => {
  try {
    const userEmail = req.auth?.email;
    if (!userEmail) return res.status(401).json({ message: "Unauthorized" });

    const courseId = String(req.params.courseId || "").trim();
    if (!courseId) return res.status(400).json({ message: "Missing courseId" });

    const course = await Course.findById(courseId).lean();
    if (!course) return res.status(404).json({ message: "Course not found" });

    const price = Number(course.price || 0);
    if (price > 0) {
      return res.status(400).json({ message: "Course is not free" });
    }

    await Enrollment.updateOne(
      { userEmail, courseId },
      {
        $setOnInsert: {
          enrolledAt: new Date(),
          paymentTxnRef: null,
        },
      },
      { upsert: true }
    );

    return res.json({ success: true, message: "Enrolled free course" });
  } catch (err) {
    console.error("POST /enrollments/free/:courseId error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
