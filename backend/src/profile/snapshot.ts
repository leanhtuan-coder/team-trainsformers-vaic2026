import {
  ALL_GROUPS,
  type DerivedProfileSnapshot,
  type DimensionEstimate,
  type DimensionGroup,
  type Evidence,
  type EvidenceSourceType,
  type Profile,
} from "./schema.js";

// Derived Profile Snapshot = projection tính lại từ Evidence Ledger mỗi lần đọc
// (BA_DESIGN.md §6.5). Không lưu snapshot — tránh trạng thái "kết luận cũ" lệch khỏi evidence.

/** Evidence được tính vào snapshot: self_report/assessment coi như user tự xác nhận khi gửi;
 * document/interaction/ai_inference phải user_confirmed=true (ETH-11). */
function isActive(e: Evidence): boolean {
  if (e.source_type === "self_report" || e.source_type === "assessment") return true;
  return e.user_confirmed;
}

export function buildSnapshot(profile: Profile): DerivedProfileSnapshot {
  const superseded = new Set(
    profile.evidence.map((e) => e.supersedes).filter(Boolean) as string[]
  );
  const active = profile.evidence.filter((e) => isActive(e) && !superseded.has(e.evidence_id));

  const groups = Object.fromEntries(
    ALL_GROUPS.map((g) => [g, [] as DimensionEstimate[]])
  ) as Record<DimensionGroup, DimensionEstimate[]>;

  for (const group of ALL_GROUPS) {
    const byDimension = new Map<string, Map<string, string[]>>();
    for (const e of active) {
      for (const claim of e.claims) {
        if (claim.group !== group) continue;
        const values = byDimension.get(claim.dimension) ?? new Map<string, string[]>();
        const refs = values.get(claim.value) ?? [];
        refs.push(e.evidence_id);
        values.set(claim.value, refs);
        byDimension.set(claim.dimension, values);
      }
    }
    groups[group] = [...byDimension.entries()].map(([dimension, values]) => ({
      dimension,
      values: [...values.entries()].map(([value, evidence_refs]) => ({ value, evidence_refs })),
      // Nhiều giá trị khác nhau cho cùng 1 dimension = có thể mâu thuẫn — phơi ra, không tự chọn 1.
      has_conflict: values.size > 1,
    }));
  }

  const bySourceType = { self_report: 0, document: 0, assessment: 0, interaction: 0, ai_inference: 0 } satisfies Record<EvidenceSourceType, number>;
  for (const e of profile.evidence) bySourceType[e.source_type]++;

  return {
    profile_id: profile.profile_id,
    generated_at: new Date().toISOString(),
    groups,
    evidence_coverage: {
      total_evidence: profile.evidence.length,
      confirmed_evidence: active.length,
      by_source_type: bySourceType,
      groups_with_evidence: ALL_GROUPS.filter((g) => groups[g].length > 0).length,
      groups_total: ALL_GROUPS.length,
    },
    assessments: active
      .filter((e) => e.assessment_detail)
      .map((e) => ({ ...e.assessment_detail!, evidence_id: e.evidence_id })),
  };
}
