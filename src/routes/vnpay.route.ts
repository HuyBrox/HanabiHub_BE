import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { Payment } from "../models/Payment";
import { Enrollment } from "../models/Enrollment";
import Course from "../models/course.model";
import {
  buildQueryString,
  signHmacSHA512,
  verifyVnpSignature,
  makeTxnRefNumeric,
  sanitizeOrderInfo,
  getClientIp,
  vnpDateNow,
  vnpDatePlusMinutes,
  isAllowedReturnUrl,
} from "../utils/vnpay";

const router = Router();

const parseMoney = (v: any) => {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const digits = String(v).replace(/[^\d]/g, "");
  const n = Number(digits || 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * POST /api/v1/payments/vnpay/create
 * body: { courseId, returnUrl? }
 */
router.post("/create", requireAuth, async (req: any, res) => {
  const { courseId, returnUrl } = req.body as {
    courseId?: string;
    returnUrl?: string;
  };
  if (!courseId) return res.status(400).json({ message: "Missing courseId" });

  const userEmail = req.auth!.email;

  // ✅ chặn mua lại nếu đã enroll
  const already = await Enrollment.exists({ userEmail, courseId });
  if (already) {
    return res.status(409).json({ message: "Course already purchased" });
  }

  const course = await Course.findById(courseId).lean();
  if (!course) return res.status(404).json({ message: "Course not found" });

  // ✅ parse price an toàn
  const price = parseMoney(course.price);
  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ message: "Course is free or invalid price" });
  }

  const amountVnd = price;
  const amountVnp = amountVnd * 100;

  const allowedOrigins = process.env.CLIENT_ORIGINS || "http://localhost:3000";
  const defaultReturn =
    process.env.CLIENT_RETURN_URL_DEFAULT ||
    "http://localhost:3000/payment-result";
  const clientReturnUrl =
    returnUrl && isAllowedReturnUrl(returnUrl, allowedOrigins)
      ? returnUrl
      : defaultReturn;

  const txnRef = makeTxnRefNumeric();

  await Payment.create({
    txnRef,
    userEmail,
    courseId: course._id,
    amountVnd,
    amountVnp,
    clientReturnUrl,
    status: "PENDING",
  });

  const host = process.env.VNPAY_HOST || "https://sandbox.vnpayment.vn";
  const payUrl = `${host}/paymentv2/vpcpay.html`;

  const publicBase = process.env.PUBLIC_BASE_URL || "http://localhost:8080";
  const vnpReturnUrl = `${publicBase}/api/v1/payments/vnpay/return`;

  const orderInfo = sanitizeOrderInfo(
    `Thanh toan khoa hoc ${String(course._id)}`
  );

  const params: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: process.env.VNPAY_TMN_CODE!,

    vnp_Amount: String(amountVnp),
    vnp_CurrCode: "VND",

    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "other",
    vnp_Locale: "vn",

    vnp_ReturnUrl: vnpReturnUrl,
    vnp_IpAddr: getClientIp(req),

    vnp_CreateDate: vnpDateNow(),
    vnp_ExpireDate: vnpDatePlusMinutes(15),
  };

  const qs = buildQueryString(params);
  const secureHash = signHmacSHA512(qs, process.env.VNPAY_SECURE_SECRET!);

  const paymentUrl = `${payUrl}?${qs}&vnp_SecureHashType=HmacSHA512&vnp_SecureHash=${secureHash}`;
  return res.json({ paymentUrl, txnRef });
});

/**
 * GET /api/v1/payments/vnpay/return
 * VNPay redirect browser về đây
 */
router.get("/return", async (req, res) => {
  const q = req.query as any as Record<string, string>;
  const ok = verifyVnpSignature(q, process.env.VNPAY_SECURE_SECRET!);

  const txnRef = q.vnp_TxnRef || "";
  const responseCode = q.vnp_ResponseCode || "";
  const transactionStatus = q.vnp_TransactionStatus || "";

  const payment = txnRef ? await Payment.findOne({ txnRef }) : null;
  const clientReturnUrl =
    payment?.clientReturnUrl ||
    process.env.CLIENT_RETURN_URL_DEFAULT ||
    "http://localhost:3000/payment-result";

  const success = ok && responseCode === "00" && transactionStatus === "00";

  if (payment && payment.status === "PENDING") {
    payment.vnpResponseCode = responseCode;
    payment.vnpTransactionStatus = transactionStatus;
    payment.vnpTransactionNo = q.vnp_TransactionNo;

    if (success) {
      payment.status = "SUCCESS";
      payment.paidAt = new Date();
      await payment.save();

      await Enrollment.updateOne(
        { userEmail: payment.userEmail, courseId: payment.courseId },
        {
          $setOnInsert: {
            paymentTxnRef: payment.txnRef,
            enrolledAt: new Date(),
          },
        },
        { upsert: true }
      );
    } else {
      payment.status = "FAILED";
      await payment.save();
    }
  }

  const redirectUrl =
    `${clientReturnUrl}?txnRef=${encodeURIComponent(txnRef)}` +
    `&status=${success ? "SUCCESS" : "FAILED"}` +
    `&sig=${ok ? "OK" : "BAD"}` +
    `&code=${encodeURIComponent(responseCode)}`;

  return res.redirect(redirectUrl);
});

/**
 * GET /api/v1/payments/vnpay/status?txnRef=...
 * (owner only)
 */
router.get("/status", requireAuth, async (req: any, res) => {
  const txnRef = String(req.query.txnRef || "").trim();
  if (!txnRef) return res.status(400).json({ message: "Missing txnRef" });

  const payment = await Payment.findOne({ txnRef }).lean();
  if (!payment) return res.status(404).json({ message: "Payment not found" });

  if (payment.userEmail !== req.auth.email) {
    return res.status(403).json({ message: "Forbidden" });
  }

  return res.json({
    txnRef: payment.txnRef,
    status: payment.status,
    courseId: payment.courseId,
    amountVnd: payment.amountVnd,
    vnpResponseCode: payment.vnpResponseCode,
    vnpTransactionNo: payment.vnpTransactionNo,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
  });
});

export default router;
