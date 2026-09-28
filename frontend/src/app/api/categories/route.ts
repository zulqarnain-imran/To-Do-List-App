import { ObjectId } from "mongodb";
import { getCategories } from "@/lib/mongodb";
import { handle, json, requireUser, fail, ApiError } from "@/lib/api";
import { categoryCreateSchema } from "@/lib/validations";
import { serializeCategory } from "@/lib/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/categories */
export async function GET() {
  try {
    const user = await requireUser();
    const categories = await getCategories();
    const docs = await categories.find({ userId: user.id }).sort({ createdAt: 1 }).toArray();
    return json({ categories: docs.map(serializeCategory) });
  } catch (error) {
    return handle(error, "categories/list");
  }
}

/** POST /api/categories */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = categoryCreateSchema.parse(await request.json());

    const categories = await getCategories();
    const now = new Date();

    // Case-insensitive duplicate guard, so "Design" and "design" cannot both
    // exist and render as two identical pills.
    const clash = await categories.findOne({
      userId: user.id,
      name: { $regex: `^${body.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    if (clash) return fail("That category already exists", 409);

    const document = {
      _id: new ObjectId(),
      userId: user.id,
      name: body.name,
      color: body.color,
      icon: body.icon,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };

    await categories.insertOne(document);

    return json({ category: serializeCategory(document) }, 201);
  } catch (error) {
    return handle(error, "categories/create");
  }
}

export async function PUT() {
  throw new ApiError(405, "Use POST");
}

export async function PATCH() {
  throw new ApiError(405, "Use POST or /api/categories/:id");
}
