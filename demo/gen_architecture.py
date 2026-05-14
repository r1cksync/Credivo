"""
Credivo LMS — Architecture Diagram as a Directed Acyclic Graph (DAG).
Shows the complete loan lifecycle data flow with AWS service interconnections.
Outputs: demo/architecture.png
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from pathlib import Path

# ── PALETTE ───────────────────────────────────────────────────────────────────
FIG_W, FIG_H = 28, 20
BG    = "#060d1a"
CARD  = "#0c1a2e"
EMRLD = "#10b981"
BLUE  = "#3b82f6"
SLATE = "#64748b"
WHITE = "#e2e8f0"
AMBER = "#f59e0b"
ROSE  = "#ef4444"
PURPL = "#a78bfa"
CYAN  = "#06b6d4"
LIME  = "#84cc16"
PINK  = "#ec4899"

# ─────────────────────────────────────────────────────────────────────────────
# NODE MAP  (x_left, y_bottom, width, height, main_label, color, sub_label)
# coordinate space: x ∈ [0,1], y ∈ [0,1] (bottom-left origin)
# ─────────────────────────────────────────────────────────────────────────────
N = {
    # ── Row 1: clients  (y ≈ 0.88)
    "borrower":  (0.02,  0.878, 0.12, 0.068, "Borrower\nBrowser",      CYAN,  None),
    "sales":     (0.175, 0.878, 0.12, 0.068, "Sales\nBrowser",         BLUE,  None),
    "sanction":  (0.330, 0.878, 0.12, 0.068, "Sanction\nBrowser",      PURPL, None),
    "disburse":  (0.485, 0.878, 0.12, 0.068, "Disbursement\nBrowser",  AMBER, None),
    "collect":   (0.640, 0.878, 0.12, 0.068, "Collection\nBrowser",    ROSE,  None),
    "admin":     (0.855, 0.878, 0.12, 0.068, "Admin\nBrowser",         LIME,  None),

    # ── Row 2: frontend  (y ≈ 0.745)
    "nextjs": (0.02, 0.740, 0.955, 0.088,
               "Next.js 14 App Router  ·  Tailwind CSS  ·  Framer Motion  ·  Recharts  —  credivo.vercel.app",
               BLUE,
               "/  ·  /register  ·  /login  ·  /dashboard  ·  /loans/[id]  ·  /apply  ·  /ops/sales  ·  /ops/sanction/[id]  ·  /ops/disbursement  ·  /ops/collection/[id]  ·  /ops/admin"),

    # ── Row 3: backend layer  (y ≈ 0.590)
    "jwt":     (0.02,  0.585, 0.145, 0.095, "JWT + bcryptjs\nAuth Middleware",     SLATE,
                "HS256 signed · HttpOnly\ncookie + Bearer header\nbcrypt factor-10 hash"),
    "express": (0.188, 0.585, 0.620, 0.095,
                "Express 4  +  TypeScript  ·  Mongoose 8  —  credivo-api.vercel.app",
                EMRLD,
                "connectDB()  ·  authenticate  ·  requireRole RBAC  ·  /api/auth  /api/borrower  /api/sales  /api/sanction  /api/disbursement  /api/collection  /api/admin"),
    "pdfkit":  (0.830, 0.585, 0.145, 0.095, "PDFKit\nServer-side PDF\nGenerator",  ROSE,
                "Sanction Letter A4\nSalary Slip PDF\non-demand render"),

    # ── Row 4: services  (y ≈ 0.375)
    "bre":      (0.02,  0.370, 0.168, 0.115, "Bureau Risk Engine\n(BRE)",       AMBER,
                 "PAN format regex\nAge 23 – 50 yrs\nSalary ≥ ₹25,000/mo\nEmployment mode check\n✓ Pass  ·  ✗ Reject"),
    "mongodb":  (0.215, 0.370, 0.168, 0.115, "MongoDB Atlas\nMongoose 8",       EMRLD,
                 "Collections:\nusers · loans\npayments · documents\ndbName: credivo"),
    "s3":       (0.410, 0.370, 0.168, 0.115, "Amazon S3\nDocument Store",       AMBER,
                 "Bucket: credivo-sagnik-2026\nSalary slip PDFs\nSanction letters\nPresigned URLs"),
    "textract": (0.605, 0.370, 0.168, 0.115, "AWS Textract\nOCR Engine",        CYAN,
                 "Input: salary slip PDF\nExtracts: employee name\nPAN · gross salary\nnet salary · employer"),
    "bedrock":  (0.800, 0.370, 0.175, 0.115, "AWS Bedrock\nClaude 3 Haiku",     PURPL,
                 "Input: extracted fields\n+ loan amount/tenure\nOutput: DTI ratio\nrisk band: Low/Med/High\nfull recommendation"),

    # ── Row 5: outputs / lifecycle  (y ≈ 0.130)
    "bre_result":  (0.02,  0.120, 0.175, 0.090, "BRE Decision\n✓ Pass / ✗ Reject",         AMBER,
                    "Rejection reasons in\nplain language\nshown to borrower"),
    "loan_state":  (0.220, 0.120, 0.210, 0.090, "Loan Status Lifecycle",                     BLUE,
                    "applied  →  sanctioned\n→  disbursed  →  closed\nimmutable audit trail"),
    "risk_record": (0.460, 0.120, 0.185, 0.090, "AI Risk Stored\nin Loan Document",           PURPL,
                    "risk band · DTI ratio\nfull recommendation\nvisible to all roles"),
    "pdf_store":   (0.675, 0.120, 0.175, 0.090, "PDF Artefacts in S3\n(Sanction Letters)",    ROSE,
                    "generated on disburse\npresigned download URL\nborrower + ops access"),
    "auto_close":  (0.875, 0.120, 0.100, 0.090, "Auto-Close\nLoan",                           LIME,
                    "balance = 0 →\nstatus: closed"),
}

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def _cx(k): return N[k][0] + N[k][2] / 2   # center-x
def _cy(k): return N[k][1] + N[k][3] / 2   # center-y
def _top(k):    return (_cx(k), N[k][1] + N[k][3])
def _bot(k):    return (_cx(k), N[k][1])
def _left(k):   return (N[k][0],            _cy(k))
def _right(k):  return (N[k][0] + N[k][2],  _cy(k))
def _tl(k):     return (N[k][0],            N[k][1] + N[k][3])
def _tr(k):     return (N[k][0] + N[k][2],  N[k][1] + N[k][3])
def _bl(k):     return (N[k][0],            N[k][1])
def _br(k):     return (N[k][0] + N[k][2],  N[k][1])

def draw_box(ax, key):
    x, y, w, h, label, color, sub = N[key]
    # card background
    rect = FancyBboxPatch((x, y), w, h,
                           boxstyle="round,pad=0,rounding_size=0.008",
                           linewidth=1.8, edgecolor=color,
                           facecolor=CARD, zorder=3, clip_on=False)
    ax.add_patch(rect)
    # left accent bar
    bar = FancyBboxPatch((x, y), 0.004, h,
                          boxstyle="square,pad=0",
                          linewidth=0, edgecolor="none",
                          facecolor=color, zorder=4, clip_on=False)
    ax.add_patch(bar)
    # glow fill
    glow = FancyBboxPatch((x, y), w, h,
                           boxstyle="round,pad=0,rounding_size=0.008",
                           linewidth=0, edgecolor="none",
                           facecolor=color, alpha=0.06, zorder=2, clip_on=False)
    ax.add_patch(glow)
    # labels
    ty = y + h / 2 + (0.018 if sub else 0)
    ax.text(x + w / 2, ty, label,
            ha="center", va="center", fontsize=8.2, fontweight="bold",
            color=WHITE, zorder=5, clip_on=False,
            multialignment="center")
    if sub:
        ax.text(x + w / 2, y + h / 2 - 0.020,
                sub, ha="center", va="center", fontsize=6.0,
                color=SLATE, zorder=5, clip_on=False,
                multialignment="center")


def draw_arrow(ax, src, dst, rad=0.0, color=SLATE, label=None,
               lw=1.3, fontsize=5.8, ls="solid", alpha=1.0):
    patch = FancyArrowPatch(
        src, dst,
        connectionstyle=f"arc3,rad={rad}",
        arrowstyle="-|>",
        mutation_scale=11,
        linewidth=lw,
        color=color,
        linestyle=ls,
        alpha=alpha,
        shrinkA=4, shrinkB=4,
        zorder=6,
    )
    ax.add_patch(patch)
    if label:
        mx = (src[0] + dst[0]) / 2 + rad * 0.12
        my = (src[1] + dst[1]) / 2 + abs(rad) * 0.06 + 0.005
        ax.text(mx, my, label,
                ha="center", va="center",
                fontsize=fontsize, color=color, fontweight="bold",
                bbox=dict(facecolor=BG, edgecolor="none", pad=1.2, alpha=0.85),
                zorder=9, clip_on=False)


def section_label(ax, x, y, text, color):
    ax.text(x, y, text, fontsize=7, color=color, fontweight="bold",
            va="center", ha="left", zorder=10, clip_on=False,
            bbox=dict(facecolor=BG, edgecolor=color, linewidth=0.7,
                      pad=2, alpha=0.9, boxstyle="round,pad=0.2"))

# ─────────────────────────────────────────────────────────────────────────────
# CANVAS
# ─────────────────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(FIG_W, FIG_H))
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(-0.01, 1.01)
ax.set_ylim(0.00, 1.04)
ax.axis("off")

# ── TITLE ─────────────────────────────────────────────────────────────────────
ax.text(0.50, 1.01, "CREDIVO — Loan Management System",
        ha="center", va="top", fontsize=22, fontweight="bold",
        color=EMRLD, zorder=10)
ax.text(0.50, 0.968, "System Architecture  ·  Data Flow  ·  Loan Lifecycle DAG",
        ha="center", va="top", fontsize=11, color=SLATE, zorder=10)

# ── LAYER BANDS (subtle background strips) ────────────────────────────────────
bands = [
    (0.860, 0.088, CYAN,  "CLIENT LAYER — Role-Aware Browser Clients"),
    (0.720, 0.135, BLUE,  "PRESENTATION LAYER — Next.js 14 App Router  (Vercel Edge Network)"),
    (0.550, 0.160, EMRLD, "API LAYER — Express 4 + TypeScript  (Vercel Serverless Functions)"),
    (0.340, 0.220, AMBER, "SERVICE LAYER — AWS & Processing Engines"),
    (0.095, 0.215, PURPL, "PERSISTENCE & OUTPUT LAYER — Storage, Lifecycle State, Artefacts"),
]
for yb, h, col, _ in bands:
    bg = FancyBboxPatch((0.00, yb), 1.00, h,
                         boxstyle="square,pad=0",
                         linewidth=0, facecolor=col, alpha=0.035, zorder=0)
    ax.add_patch(bg)
    ax.plot([0.00, 1.00], [yb + h, yb + h], color=col, alpha=0.12, lw=0.6, zorder=1)

# Vertical section labels
for yb, h, col, txt in bands:
    section_label(ax, 0.005, yb + h - 0.012, txt, col)

# ─────────────────────────────────────────────────────────────────────────────
# DRAW ALL NODES
# ─────────────────────────────────────────────────────────────────────────────
for key in N:
    draw_box(ax, key)

# ─────────────────────────────────────────────────────────────────────────────
# DRAW ALL EDGES  (the DAG)
# ─────────────────────────────────────────────────────────────────────────────

# ── 1. Clients → Next.js (straight down)
for key in ["borrower", "sales", "sanction", "disburse", "collect", "admin"]:
    col = N[key][5]
    draw_arrow(ax, _bot(key), _top("nextjs"), rad=0.0, color=col, lw=1.1, alpha=0.7)

# ── 2. Next.js ⇄ Express API (bidirectional — REST over HTTPS)
draw_arrow(ax,
           (N["nextjs"][0]+0.28, N["nextjs"][1]),
           (N["express"][0]+0.20, N["express"][1]+N["express"][3]),
           rad=0.08, color=BLUE, lw=1.8, label="REST / HTTPS")

# Return path (data responses back up to frontend)
draw_arrow(ax,
           (N["express"][0]+0.40, N["express"][1]+N["express"][3]),
           (N["nextjs"][0]+0.48, N["nextjs"][1]),
           rad=0.10, color=EMRLD, lw=1.5, label="JSON responses", alpha=0.7)

# ── 3. JWT guard → Express (horizontal, left side)
draw_arrow(ax, _right("jwt"), _left("express"),
           rad=0.0, color=SLATE, lw=1.4, label="auth guard\nevery request")

# ── 4. Express → PDFKit (horizontal, right side)
draw_arrow(ax, _right("express"), _left("pdfkit"),
           rad=0.0, color=ROSE, lw=1.4, label="generate\nPDF")

# ── 5. Express → BRE (diagonal down-left, "validate application")
draw_arrow(ax,
           (N["express"][0]+0.05, N["express"][1]),
           (N["bre"][0]+N["bre"][2]*0.6, N["bre"][1]+N["bre"][3]),
           rad=-0.18, color=AMBER, lw=1.4, label="validate\napplication")

# ── 6. BRE → BRE result (straight down)
draw_arrow(ax, _bot("bre"), _top("bre_result"),
           rad=0.0, color=AMBER, lw=1.3, label="pass/reject\ndecision")

# ── 7. BRE result → Express  [LOOP 1 — long curved arrow going back up-right]
draw_arrow(ax,
           _right("bre_result"),
           (N["express"][0]+0.04, N["express"][1]),
           rad=-0.42, color=AMBER, lw=1.6,
           label="BRE result\n→ API response", fontsize=6)

# ── 8. Express → MongoDB (down, CRUD)
draw_arrow(ax,
           (N["express"][0]+0.18, N["express"][1]),
           (N["mongodb"][0]+N["mongodb"][2]*0.5, N["mongodb"][1]+N["mongodb"][3]),
           rad=0.0, color=EMRLD, lw=1.5, label="CRUD\nloans·users\npayments")

# ── 9. MongoDB → loan state lifecycle (down)
draw_arrow(ax, _bot("mongodb"), _top("loan_state"),
           rad=0.0, color=BLUE, lw=1.3, label="status\nupdates")

# ── 10. Loan state → auto-close  [loop within persistence layer]
draw_arrow(ax, _right("loan_state"), _left("auto_close"),
           rad=-0.20, color=LIME, lw=1.2, label="balance=0\n→ close")

# ── 11. Auto-close → MongoDB  [LOOP 2 — curved back to MongoDB]
draw_arrow(ax,
           _top("auto_close"),
           (N["mongodb"][0]+N["mongodb"][2], N["mongodb"][1]+0.02),
           rad=0.35, color=LIME, lw=1.2, label="write\nclosed status")

# ── 12. Express → S3 (down, upload salary slip)
draw_arrow(ax,
           (N["express"][0]+0.35, N["express"][1]),
           (N["s3"][0]+N["s3"][2]*0.5, N["s3"][1]+N["s3"][3]),
           rad=0.0, color=AMBER, lw=1.5, label="upload salary\nslip PDF → S3")

# ── 13. S3 → Textract (horizontal right — OCR trigger)
draw_arrow(ax, _right("s3"), _left("textract"),
           rad=0.0, color=CYAN, lw=1.6, label="async OCR\ntrigger")

# ── 14. Textract → Express  [LOOP 3 — long curved arrow back up to API]
draw_arrow(ax,
           (N["textract"][0]+N["textract"][2]*0.4, N["textract"][1]+N["textract"][3]),
           (N["express"][0]+0.50, N["express"][1]),
           rad=0.35, color=CYAN, lw=1.8,
           label="extracted fields:\nname · PAN · gross\nnet salary → API", fontsize=5.8)

# ── 15. Express → Bedrock (diagonal down-right — risk invoke)
draw_arrow(ax,
           (N["express"][0]+N["express"][2]-0.07, N["express"][1]),
           (N["bedrock"][0]+N["bedrock"][2]*0.45, N["bedrock"][1]+N["bedrock"][3]),
           rad=0.18, color=PURPL, lw=1.5, label="risk\ninvocation")

# ── 16. Bedrock → risk record (down)
draw_arrow(ax, _bot("bedrock"), _top("risk_record"),
           rad=0.0, color=PURPL, lw=1.3, label="AI risk\nsummary")

# ── 17. risk record → MongoDB  [LOOP 4 — goes left along bottom]
draw_arrow(ax,
           _left("risk_record"),
           (N["mongodb"][0]+N["mongodb"][2], N["mongodb"][1]+0.06),
           rad=0.25, color=PURPL, lw=1.5,
           label="embedded in\nloan document", fontsize=5.8)

# ── 18. PDFKit → PDF store in S3 (diagonal down)
draw_arrow(ax,
           (N["pdfkit"][0]+N["pdfkit"][2]*0.5, N["pdfkit"][1]),
           (N["pdf_store"][0]+N["pdf_store"][2]*0.5, N["pdf_store"][1]+N["pdf_store"][3]),
           rad=0.0, color=ROSE, lw=1.5, label="store\nartefact")

# ── 19. PDF store → Next.js  [LOOP 5 — very long loop back up to frontend]
draw_arrow(ax,
           (N["pdf_store"][0]+N["pdf_store"][2]*0.5, N["pdf_store"][1]+N["pdf_store"][3]),
           (N["nextjs"][0]+N["nextjs"][2]-0.06, N["nextjs"][1]),
           rad=-0.40, color=ROSE, lw=1.6,
           label="presigned URL →\nborrower downloads\nsanction letter", fontsize=5.8)

# ── 20. S3 → PDF store (dashed — sanction letters also stored in S3)
draw_arrow(ax,
           (N["s3"][0]+N["s3"][2]*0.7, N["s3"][1]),
           (N["pdf_store"][0]+0.02, N["pdf_store"][1]+N["pdf_store"][3]),
           rad=-0.20, color=AMBER, lw=1.1, ls="dashed", alpha=0.5,
           label="salary slips\nalso in S3")

# ── 21. MongoDB → Express (read path — loan data back to API)  [LOOP 6]
draw_arrow(ax,
           (N["mongodb"][0]+0.02, N["mongodb"][1]+N["mongodb"][3]),
           (N["express"][0]+0.10, N["express"][1]),
           rad=0.20, color=EMRLD, lw=1.1, alpha=0.55,
           label="read\nqueries")

# ─────────────────────────────────────────────────────────────────────────────
# LEGEND
# ─────────────────────────────────────────────────────────────────────────────
legend_items = [
    (CYAN,  "Borrower"),
    (BLUE,  "Sales"),
    (PURPL, "Sanction"),
    (AMBER, "Disbursement / AWS"),
    (ROSE,  "Collection / PDFKit"),
    (LIME,  "Admin / Auto-close"),
    (EMRLD, "Backend / MongoDB"),
    (SLATE, "Auth middleware"),
]
lx, ly = 0.02, 0.058
ax.text(lx, ly + 0.022, "Role & Service Colour Legend:", fontsize=7.5,
        color=SLATE, fontweight="bold")
for i, (col, lbl) in enumerate(legend_items):
    ix = lx + i * 0.121
    ax.add_patch(FancyBboxPatch((ix, ly - 0.002), 0.016, 0.018,
                                 boxstyle="round,pad=0.001",
                                 facecolor=col, edgecolor="none", zorder=5))
    ax.text(ix + 0.020, ly + 0.007, lbl, fontsize=6.8, color=WHITE, va="center")

# ── TECH BAR ──────────────────────────────────────────────────────────────────
ax.text(0.50, 0.018,
        "Next.js 14  ·  Express 4  ·  TypeScript  ·  Mongoose 8  ·  MongoDB Atlas  ·  "
        "Amazon S3  ·  AWS Textract  ·  AWS Bedrock (Claude 3 Haiku)  ·  PDFKit  ·  "
        "Recharts  ·  Tailwind CSS  ·  Framer Motion  ·  Vercel",
        ha="center", va="center", fontsize=7.5, color=SLATE, style="italic")

ax.text(0.50, 0.004,
        "credivo.vercel.app  ·  credivo-api.vercel.app",
        ha="center", va="center", fontsize=8.5, color=EMRLD, fontweight="bold")

# ─────────────────────────────────────────────────────────────────────────────
out = Path(__file__).parent / "architecture.png"
plt.tight_layout(pad=0.2)
plt.savefig(str(out), dpi=150, bbox_inches="tight",
            facecolor=BG, edgecolor="none")
plt.close()
print(f"✓ Architecture DAG saved: {out}")
