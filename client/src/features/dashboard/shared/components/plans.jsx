import React from "react";
import { Card } from "../../../../components/shared";
import { IconBtn, IcoAssign, IcoEdit, IcoTrash } from "./icons";
import { useIsMobile } from "../lib/hooks";

export function MacroPill({ label, value, tone = "#2563eb" }) {
  const isMobile = useIsMobile(640);
  return (
    <div style={{ padding: isMobile ? "9px 10px" : "10px 12px", borderRadius: 14, background: `${tone}12`, border: `1px solid ${tone}22`, minWidth: isMobile ? 0 : 82, width: isMobile ? "100%" : "auto" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: isMobile ? 14 : 15, fontWeight: 800, color: tone, lineHeight: 1.2 }}>{value}</div>
    </div>
  );
}

export function WorkoutPlanCard({ plan, onAssign, onEdit, onDelete }) {
  const isMobile = useIsMobile(640);
  const badgeTone = plan.level === "Advanced" ? "#dc2626" : plan.level === "Intermediate" ? "#ea580c" : "#16a34a";

  return (
    <Card style={{ padding: 0, overflow: "hidden", border: "1px solid rgba(15, 23, 42, 0.08)", boxShadow: "0 18px 32px rgba(15, 23, 42, 0.06)" }}>
      <div style={{ padding: 18, background: "linear-gradient(135deg, #fff6e8, #ffffff 60%)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: `${badgeTone}14`, color: badgeTone, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {plan.level}
            </div>
            <div style={{ marginTop: 12, fontSize: 21, fontWeight: 800, letterSpacing: "-0.03em", color: "#111827" }}>{plan.name}</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{plan.category} focused routine built for {plan.duration}.</div>
          </div>
          <div style={{ display: "flex", gap: 6, width: isMobile ? "100%" : "auto" }}>
            <IconBtn title="Assign to Member" onClick={onAssign}><IcoAssign /></IconBtn>
            <IconBtn title="Edit" onClick={onEdit}><IcoEdit /></IconBtn>
            {onDelete ? <IconBtn title="Delete" danger onClick={onDelete}><IcoTrash /></IconBtn> : null}
          </div>
        </div>
      </div>
      <div style={{ padding: 18, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 10 }}>
        <MacroPill label="Duration" value={plan.duration} tone="#ea580c" />
        <MacroPill label="Days" value={`${plan.days} / week`} tone="#2563eb" />
        <MacroPill label="Track" value={plan.category} tone="#7c3aed" />
      </div>
    </Card>
  );
}

export function MealPlanCard({ plan, onAssign, onEdit, onDelete }) {
  const isMobile = useIsMobile(640);
  const previewMeals = (plan.meals || []).slice(0, 3);

  return (
    <Card style={{ padding: 0, overflow: "hidden", border: "1px solid rgba(15, 23, 42, 0.08)", boxShadow: "0 18px 32px rgba(15, 23, 42, 0.06)" }}>
      <div style={{ padding: 18, background: "linear-gradient(135deg, #eefbf1, #ffffff 62%)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: "rgba(22, 163, 74, 0.12)", color: "#15803d", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {plan.goal}
            </div>
            <div style={{ marginTop: 12, fontSize: 21, fontWeight: 800, letterSpacing: "-0.03em", color: "#111827" }}>{plan.name}</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
              Structured for consistency with real foods and clear meal timing.
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, width: isMobile ? "100%" : "auto" }}>
            <IconBtn title="Assign to Member" onClick={onAssign}><IcoAssign /></IconBtn>
            <IconBtn title="Edit" onClick={onEdit}><IcoEdit /></IconBtn>
            {onDelete ? <IconBtn title="Delete" danger onClick={onDelete}><IcoTrash /></IconBtn> : null}
          </div>
        </div>
      </div>
      <div style={{ padding: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <MacroPill label="Calories" value={`${plan.calories} kcal`} tone="#16a34a" />
        <MacroPill label="Protein" value={`${plan.protein}g`} tone="#2563eb" />
        <MacroPill label="Carbs" value={`${plan.carbs}g`} tone="#ca8a04" />
        <MacroPill label="Fat" value={`${plan.fat}g`} tone="#dc2626" />
      </div>
      <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {previewMeals.map((meal) => (
          <div key={`${meal.time}-${meal.name}`} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{meal.name || "Meal slot"}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{meal.time || "Flexible"}</div>
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
              {Array.isArray(meal.foods) && meal.foods.length ? meal.foods.join(", ") : "Foods not listed yet"}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ExerciseTile({ exercise }) {
  const isMobile = useIsMobile(640);
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr auto auto auto", gap: 10, alignItems: "center", padding: isMobile ? "14px" : "12px 14px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1.4 }}>{exercise.name}</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3,minmax(0,1fr))" : "unset", gap: 10 }}>
        <MacroPill label="Sets" value={exercise.sets} tone="#dc2626" />
        <MacroPill label="Reps" value={exercise.reps} tone="#2563eb" />
        <MacroPill label="Rest" value={exercise.rest} tone="#16a34a" />
      </div>
    </div>
  );
}

export function MealTimelineItem({ meal }) {
  return (
    <div style={{ position: "relative", paddingLeft: 22 }}>
      <div style={{ position: "absolute", left: 3, top: 7, bottom: -16, width: 2, background: "linear-gradient(180deg, rgba(22,163,74,0.36), rgba(22,163,74,0.08))" }} />
      <div style={{ position: "absolute", left: 0, top: 4, width: 8, height: 8, borderRadius: 999, background: "#16a34a" }} />
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{meal.name || "Meal"}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#15803d" }}>{meal.time || "Flexible"}</div>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
          {Array.isArray(meal.foods) && meal.foods.length ? meal.foods.join(", ") : "Foods not listed yet"}
        </div>
      </div>
    </div>
  );
}
