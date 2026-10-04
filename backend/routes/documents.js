const { mapDocument } = require("../mappers/documentMapper");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const express = require("express");
const upload = require("../middleware/upload");
const router = express.Router();
const { put } = require("@vercel/blob");
const pool = require("../config/db");
const auditLogger = require("../services/auditLogger");
const { put, get, del } = require("@vercel/blob");
// GET all documents for a family
router.get(
  "/",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    try {
      const { family_id } = req.query;

      let query = `
        SELECT *
        FROM documents
      `;

      const params = [];

      if (family_id !== undefined) {
        const familyId = Number(family_id);

        if (!Number.isInteger(familyId) || familyId <= 0) {
          return res.status(400).json({
            success: false,
            message: "معرّف الأسرة غير صالح.",
          });
        }

        query += ` WHERE family_id = $1`;
        params.push(familyId);
      }

      query += ` ORDER BY uploaded_at DESC`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        documents: result.rows.map(mapDocument),
      });
    } catch (error) {
      console.error("GET DOCUMENTS ERROR:", error);

      res.status(500).json({
        success: false,
        message: "تعذر تحميل الوثائق.",
      });
    }
  },
);
// POST create new document
router.post(
  "/",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  upload.single("document"),

  async (req, res) => {
    try {
      const { family_id, type, head_national_id } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "يرجى اختيار ملف",
        });
      }

      const familyId = Number(family_id);

      if (!Number.isInteger(familyId) || familyId <= 0) {
        return res.status(400).json({
          success: false,
          message: "معرّف العائلة غير صالح.",
        });
      }
      if (typeof type !== "string" || !type.trim()) {
        return res.status(400).json({
          success: false,
          message: "نوع الوثيقة مطلوب.",
        });
      }
      const documentType = type.trim();
      const nationalId = head_national_id?.trim() || null;
      if (nationalId !== null && !/^\d+$/.test(nationalId)) {
        return res.status(400).json({
          success: false,
          message: "رقم هوية رب الأسرة غير صالح.",
        });
      }
      const familyResult = await pool.query(
        `
  SELECT head_name, file_number
  FROM families
  WHERE id = $1
    AND is_deleted = FALSE
  `,
        [familyId],
      );

      if (!familyResult.rows[0]) {
        return res.status(404).json({
          success: false,
          message: "العائلة غير موجودة أو محذوفة.",
        });
      }

      const family = familyResult.rows[0];

      const safeFileName = req.file.originalname.replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      );

      const blobPath = `documents/family-${familyId}/${Date.now()}-${safeFileName}`;

      const blob = await put(blobPath, req.file.buffer, {
        access: "private",
        contentType: req.file.mimetype,
      });

      const result = await pool.query(
        `
  INSERT INTO documents
  (
    family_id,
    head_national_id,
    type,
    name,
    file_url,
    uploaded_by
  )
  VALUES
  ($1,$2,$3,$4,$5,$6)
  RETURNING *
  `,
        [
          familyId,
          nationalId,
          documentType,
          req.file.originalname,
          blob.pathname,
          req.user.id,
        ],
      );
      const document = result.rows[0];
      const documentStatusLabels = {
        pending: "قيد المراجعة",
        approved: "معتمدة",
        rejected: "مرفوضة",
      };

      const formatDocumentStatus = (value) => {
        if (!value) {
          return "غير محددة";
        }

        const normalizedValue = String(value).trim().toLowerCase();

        return documentStatusLabels[normalizedValue] || value;
      };

      const auditDetails = [
        `تم رفع الوثيقة "${document.name}".`,
        `العائلة: ${family.head_name} (${family.file_number}).`,
        `نوع الوثيقة: ${document.type || "غير محدد"}.`,
        `حالة الوثيقة: ${formatDocumentStatus(document.status)}.`,
      ].join("\n");

      await auditLogger(
        req.user.id,
        "UPLOAD_DOCUMENT",
        "الوثائق",
        document.id,
        auditDetails,
      );

      res.status(201).json({
        success: true,
        document: mapDocument(document),
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        success: false,
        message: "حدث خطأ داخلي في الخادم.",
      });
    }
  },
);
// DOWNLOAD DOCUMENT
router.get(
  "/:id/download",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const documentId = Number(id);

      if (!Number.isInteger(documentId) || documentId <= 0) {
        return res.status(400).json({
          success: false,
          message: "معرّف الوثيقة غير صالح.",
        });
      }

      const result = await pool.query(
        `
        SELECT id, name, file_url
        FROM documents
        WHERE id = $1
        `,
        [documentId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "الوثيقة غير موجودة",
        });
      }

      const document = result.rows[0];

      if (!document.file_url) {
        return res.status(404).json({
          success: false,
          message: "ملف الوثيقة غير موجود",
        });
      }

      // file_url may be:
      // /uploads/filename.pdf
      // or a full URL such as:
      // https://....blob.vercel-storage.com/filename.pdf

      if (!document.file_url) {
        return res.status(404).json({
          success: false,
          message: "ملف الوثيقة غير موجود",
        });
      }

      // إذا كان الملف مخزنًا على Vercel Blob أو أي Storage خارجي
      if (
        document.file_url.startsWith("http://") ||
        document.file_url.startsWith("https://")
      ) {
        return res.redirect(document.file_url);
      }

      // إذا كان الملف محليًا
      const relativePath = document.file_url.replace(/^\/+/, "");
      const filePath = path.resolve(relativePath);

      return res.sendFile(filePath, (err) => {
        if (err) {
          console.error("Document download error:", err);

          if (!res.headersSent) {
            return res.status(404).json({
              success: false,
              message: "تعذر العثور على ملف الوثيقة",
            });
          }
        }
      });
    } catch (err) {
      console.error("Download document error:", err);

      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء تحميل الوثيقة",
      });
    }
  },
);
// UPDATE DOCUMENT STATUS
router.put(
  "/:id",
  authMiddleware,
  authorize(["admin", "representative"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const documentId = Number(id);
      const { status } = req.body;

      if (!Number.isInteger(documentId) || documentId <= 0) {
        return res.status(400).json({
          success: false,
          message: "معرّف الوثيقة غير صالح.",
        });
      }
      if (typeof status !== "string" || !status.trim()) {
        return res.status(400).json({
          success: false,
          message: "حالة الوثيقة مطلوبة.",
        });
      }
      const normalizedStatus = status.trim().toLowerCase();

      if (!["pending", "approved", "rejected"].includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: "حالة الوثيقة غير صالحة.",
        });
      }

      const existingDocument = await pool.query(
        `
  SELECT id, name, status
  FROM documents
  WHERE id = $1
  `,
        [documentId],
      );

      if (!existingDocument.rows[0]) {
        return res.status(404).json({
          success: false,
          message: "الوثيقة غير موجودة.",
        });
      }

      const oldDocument = existingDocument.rows[0];

      const result = await pool.query(
        `
    UPDATE documents
    SET status = $1
    WHERE id = $2
    RETURNING *
  `,
        [normalizedStatus, documentId],
      );

      const document = result.rows[0];

      await auditLogger(
        req.user.id,
        "UPDATE_DOCUMENT_STATUS",
        "الوثائق",
        document.id,
        `تم تعديل حالة الوثيقة "${document.name}" من "${oldDocument.status || "غير محددة"}" إلى "${document.status}".`,
      );
      if (!result.rows[0]) {
        return res.status(404).json({
          success: false,
          message: "الوثيقة غير موجودة.",
        });
      }

      res.json({
        success: true,
        document: mapDocument(document),
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "حدث خطأ داخلي في الخادم.",
      });
    }
  },
);

// DELETE document
router.delete(
  "/:id",
  authMiddleware,
  authorize(["admin", "representative", "employee"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const documentId = Number(id);

      if (!Number.isInteger(documentId) || documentId <= 0) {
        return res.status(400).json({
          success: false,
          message: "معرّف الوثيقة غير صالح.",
        });
      }

      const existingDocument = await pool.query(
        `
        SELECT
          d.id,
          d.name,
          d.type,
          d.status,
          d.family_id,
          d.file_url,
          f.head_name,
          f.file_number
        FROM documents d
        LEFT JOIN families f
          ON f.id = d.family_id
        WHERE d.id = $1
        `,
        [documentId],
      );

      if (!existingDocument.rows[0]) {
        return res.status(404).json({
          success: false,
          message: "الوثيقة غير موجودة.",
        });
      }

      const document = existingDocument.rows[0];

      const documentStatusLabels = {
        pending: "قيد المراجعة",
        approved: "مقبولة",
        rejected: "مرفوضة",
      };

      const formatDocumentStatus = (value) => {
        if (!value) {
          return "غير محددة";
        }

        const normalizedValue = String(value).trim().toLowerCase();

        return documentStatusLabels[normalizedValue] || value;
      };

      /*
       * حذف الملف من التخزين
       *
       * إذا كان file_url رابط Vercel Blob:
       * يتم حذفه باستخدام del()
       *
       * إذا كان file_url مسارًا قديمًا داخل uploads:
       * يتم حذفه من القرص المحلي.
       */

      if (document.file_url) {
        const fileUrl = String(document.file_url).trim();

        // ==============================
        // Vercel Blob
        // ==============================
        if (fileUrl.startsWith("https://") || fileUrl.startsWith("http://")) {
          try {
            await del(fileUrl);
            console.log("Blob deleted successfully:", fileUrl);
          } catch (blobError) {
            console.error("Blob deletion error:", blobError);
          }
        }

        // ==============================
        // Old local uploads
        // ==============================
        else {
          try {
            const normalizedFileUrl = fileUrl.replace(/^\/+/, "");

            const uploadsDir = path.resolve(__dirname, "../uploads");
            const candidatePath = path.resolve(
              __dirname,
              "..",
              normalizedFileUrl,
            );

            const uploadsPrefix = `${uploadsDir}${path.sep}`;

            if (candidatePath.startsWith(uploadsPrefix)) {
              try {
                await fs.unlink(candidatePath);
                console.log("Local document deleted:", candidatePath);
              } catch (fileError) {
                if (fileError.code !== "ENOENT") {
                  console.error("Document file deletion error:", fileError);
                }
              }
            } else {
              console.error(
                "رفض حذف ملف خارج مجلد uploads:",
                document.file_url,
              );
            }
          } catch (filePathError) {
            console.error("Local document path error:", filePathError);
          }
        }
      }

      /*
       * حذف سجل الوثيقة من قاعدة البيانات
       */
      await pool.query("DELETE FROM documents WHERE id = $1", [documentId]);

      /*
       * تجهيز سجل التدقيق
       */
      const auditDetails = [
        `تم حذف الوثيقة "${document.name}".`,
        `العائلة: ${
          document.head_name
            ? `${document.head_name} (${document.file_number})`
            : "غير محددة"
        }.`,
        `نوع الوثيقة: ${document.type || "غير محدد"}.`,
        `حالة الوثيقة: ${formatDocumentStatus(document.status)}.`,
      ].join("\n");

      /*
       * تسجيل العملية في Audit Log
       */
      await auditLogger(
        req.user.id,
        "DELETE_DOCUMENT",
        "الوثائق",
        document.id,
        auditDetails,
      );

      res.json({
        success: true,
        message: "تم حذف الوثيقة بنجاح.",
      });
    } catch (err) {
      console.error("DELETE DOCUMENT ERROR:", err);

      res.status(500).json({
        success: false,
        message: "حدث خطأ داخلي في الخادم.",
      });
    }
  },
);
module.exports = router;
