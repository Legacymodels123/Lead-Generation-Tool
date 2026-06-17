import { updateCustomColumn, deleteCustomColumn } from "@/lib/db/custom-columns";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const columnId = params.id;
    const updates = await request.json();

    if (!columnId) {
      return Response.json({ error: "Missing column ID" }, { status: 400 });
    }

    const updated = await updateCustomColumn(columnId, updates);

    if (!updated) {
      return Response.json({ error: "Failed to update column" }, { status: 500 });
    }

    return Response.json(updated);
  } catch (error) {
    console.error("Error updating column:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const columnId = params.id;

    if (!columnId) {
      return Response.json({ error: "Missing column ID" }, { status: 400 });
    }

    const success = await deleteCustomColumn(columnId);

    if (!success) {
      return Response.json({ error: "Failed to delete column" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting column:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
