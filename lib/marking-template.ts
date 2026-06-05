export type TemplateGroup = "lower" | "upper";
export type ComponentType = "manual" | "omr";

export type MarkComponent = {
  key: string;
  label: string;
  type: ComponentType;
  max_mark: number;
  question_count?: number;
  included_in_total?: boolean;
};

export type GradeTemplate = {
  group: TemplateGroup;
  label: string;
  components: MarkComponent[];
  normalization_total?: number;
};

export type SubjectExamSettings = {
  deadline?: string | null;
  grade_templates?: Partial<Record<TemplateGroup, GradeTemplate>>;
  objective_questions?: number;
  objective_max?: number;
  subjective_questions?: number;
  subjective_max?: number;
};

export type ComputedComponentMark = MarkComponent & {
  mark: number;
  effective_max_mark: number;
};

export type ComputedMarkSummary = {
  components: ComputedComponentMark[];
  raw_total: number;
  total_max: number;
  percentage: number;
};

function toNumber(value: unknown, fallback = 0) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function createComponent(
  key: string,
  label: string,
  type: ComponentType,
  max_mark: number,
  options?: { question_count?: number; included_in_total?: boolean },
): MarkComponent {
  return {
    key,
    label,
    type,
    max_mark,
    question_count: options?.question_count,
    included_in_total: options?.included_in_total ?? true,
  };
}

function cloneTemplate(template: GradeTemplate): GradeTemplate {
  return {
    ...template,
    components: template.components.map((component) => ({ ...component })),
  };
}

function subjectPresetLower(subjectName: string): GradeTemplate {
  const normalized = slugify(subjectName);

  if (["bahasa melayu", "bm", "english", "bahasa inggeris", "bi"].includes(normalized)) {
    return {
      group: "lower",
      label: "Form 1-3",
      components: [
        createComponent("k1", "Kertas 1 (Pemahaman)", "manual", 60),
        createComponent("k2", "Kertas 2 (Penulisan)", "manual", 40),
      ],
      normalization_total: 100,
    };
  }

  if (["sejarah", "geografi"].includes(normalized)) {
    return {
      group: "lower",
      label: "Form 1-3",
      components: [
        createComponent("objektif", "Objektif", "omr", 20, { question_count: 20 }),
        createComponent("subjektif", "Subjektif", "manual", 60),
      ],
      normalization_total: 80,
    };
  }

  if (["matematik", "math", "sains", "pendidikan islam"].includes(normalized)) {
    return {
      group: "lower",
      label: "Form 1-3",
      components: [
        createComponent("objektif", "Objektif", "omr", 20, { question_count: 20 }),
        createComponent("subjektif", "Subjektif", "manual", 80),
      ],
      normalization_total: 100,
    };
  }

  if (["rbt"].includes(normalized)) {
    return {
      group: "lower",
      label: "Form 1-3",
      components: [
        createComponent("objektif", "Objektif", "omr", 10, { question_count: 10 }),
        createComponent("subjektif", "Subjektif", "manual", 70),
      ],
      normalization_total: 80,
    };
  }

  if (["pj", "pendidikan jasmani"].includes(normalized)) {
    return {
      group: "lower",
      label: "Form 1-3",
      components: [
        createComponent("objektif", "Objektif", "omr", 40, { question_count: 40 }),
        createComponent("subjektif", "Subjektif", "manual", 20),
      ],
      normalization_total: 60,
    };
  }

  return {
    group: "lower",
    label: "Form 1-3",
    components: [
      createComponent("objektif", "Objektif", "omr", 40, { question_count: 40 }),
      createComponent("subjektif", "Subjektif", "manual", 60),
    ],
    normalization_total: 100,
  };
}

function subjectPresetUpper(subjectName: string): GradeTemplate {
  const normalized = slugify(subjectName);

  if (["bahasa melayu", "bm", "pendidikan islam"].includes(normalized)) {
    return {
      group: "upper",
      label: "Form 4-5",
      components: [
        createComponent("k1", "Kertas 1", "manual", 100),
        createComponent("k2", "Kertas 2", "manual", 100),
      ],
      normalization_total: 200,
    };
  }

  if (["english", "bahasa inggeris", "bi"].includes(normalized)) {
    return {
      group: "upper",
      label: "Form 4-5",
      components: [
        createComponent("k1", "Kertas 1", "manual", 40),
        createComponent("k2", "Kertas 2", "manual", 60),
      ],
      normalization_total: 100,
    };
  }

  if (["matematik", "math", "sejarah", "akaun", "prinsip perakaunan"].includes(normalized)) {
    return {
      group: "upper",
      label: "Form 4-5",
      components: [
        createComponent("k1", "Kertas 1", "omr", 40, { question_count: 40 }),
        createComponent("k2", "Kertas 2", "manual", 100),
      ],
      normalization_total: 140,
    };
  }

  if (["addmath", "additional mathematics", "matematik tambahan"].includes(normalized)) {
    return {
      group: "upper",
      label: "Form 4-5",
      components: [
        createComponent("k1", "Kertas 1", "manual", 80),
        createComponent("k2", "Kertas 2", "manual", 100),
      ],
      normalization_total: 180,
    };
  }

  if (["sains", "sains teras"].includes(normalized)) {
    return {
      group: "upper",
      label: "Form 4-5",
      components: [
        createComponent("k1", "Kertas 1", "omr", 40, { question_count: 40 }),
        createComponent("k2", "Kertas 2", "manual", 80),
      ],
      normalization_total: 120,
    };
  }

  if (["fizik", "kimia", "bio", "biologi"].includes(normalized)) {
    return {
      group: "upper",
      label: "Form 4-5",
      components: [
        createComponent("k1", "Kertas 1", "omr", 40, { question_count: 40 }),
        createComponent("k2", "Kertas 2", "manual", 100),
        createComponent("k3", "Kertas 3", "manual", 30),
      ],
      normalization_total: 170,
    };
  }

  if (["pendidikan seni", "seni visual"].includes(normalized)) {
    return {
      group: "upper",
      label: "Form 4-5",
      components: [
        createComponent("k1", "Kertas 1", "omr", 40, { question_count: 40 }),
        createComponent("k2", "Kertas 2", "manual", 50),
      ],
      normalization_total: 90,
    };
  }

  if (["perniagaan"].includes(normalized)) {
    return {
      group: "upper",
      label: "Form 4-5",
      components: [createComponent("k1", "Kertas 1", "manual", 80)],
      normalization_total: 80,
    };
  }

  return {
    group: "upper",
    label: "Form 4-5",
    components: [
      createComponent("k1", "Kertas 1", "omr", 40, { question_count: 40 }),
      createComponent("k2", "Kertas 2", "manual", 60),
    ],
    normalization_total: 100,
  };
}

export function buildSubjectTemplatePreset(subjectName: string, group: TemplateGroup): GradeTemplate {
  return cloneTemplate(group === "lower" ? subjectPresetLower(subjectName) : subjectPresetUpper(subjectName));
}

export function sanitizeGradeTemplate(group: TemplateGroup, value: unknown, fallbackSubjectName = ""): GradeTemplate {
  const fallback = buildSubjectTemplatePreset(fallbackSubjectName, group);
  if (!value || typeof value !== "object") return fallback;

  const record = value as Record<string, unknown>;
  const rawComponents = Array.isArray(record.components) ? record.components : [];
  const components = rawComponents
    .map((component, index) => {
      if (!component || typeof component !== "object") return null;
      const item = component as Record<string, unknown>;
      const type = toStringValue(item.type) === "omr" ? "omr" : "manual";
      const key = toStringValue(item.key) || `component_${index + 1}`;
      const maxMark = toNumber(item.max_mark, 0);
      if (maxMark < 0) return null;
      return {
        key,
        label: toStringValue(item.label) || key,
        type,
        max_mark: maxMark,
        question_count: toNumber(item.question_count, 0) || undefined,
        included_in_total: item.included_in_total !== false,
      } satisfies MarkComponent;
    })
    .filter(Boolean) as MarkComponent[];

  if (components.length === 0) return fallback;

  return {
    group,
    label: toStringValue(record.label) || fallback.label,
    components,
    normalization_total: toNumber(record.normalization_total, 0) || undefined,
  };
}

export function getSubjectSettingsForTemplate(
  subjectSettings: Record<string, unknown> | null | undefined,
  subjectId: string,
  subjectName = "",
): SubjectExamSettings {
  const all = subjectSettings && typeof subjectSettings === "object" ? subjectSettings : {};
  const raw = subjectId ? (all[subjectId] as Record<string, unknown> | undefined) : undefined;
  const settings = raw && typeof raw === "object" ? raw : {};
  const lowerRaw =
    settings.grade_templates &&
    typeof settings.grade_templates === "object" &&
    "lower" in settings.grade_templates
      ? (settings.grade_templates as Record<string, unknown>).lower
      : undefined;
  const upperRaw =
    settings.grade_templates &&
    typeof settings.grade_templates === "object" &&
    "upper" in settings.grade_templates
      ? (settings.grade_templates as Record<string, unknown>).upper
      : undefined;

  return {
    ...settings,
    deadline: toStringValue(settings.deadline) || null,
    grade_templates: {
      lower: sanitizeGradeTemplate("lower", lowerRaw ?? settings, subjectName),
      upper: sanitizeGradeTemplate("upper", upperRaw ?? settings, subjectName),
    },
  };
}

export function getTemplateGroupForGrade(grade: number | null | undefined): TemplateGroup {
  return Number(grade ?? 0) >= 4 ? "upper" : "lower";
}

export function getGradeTemplateForClass(params: {
  subjectSettings: Record<string, unknown> | null | undefined;
  subjectId: string;
  subjectName?: string;
  grade?: number | null;
}) {
  const settings = getSubjectSettingsForTemplate(
    params.subjectSettings,
    params.subjectId,
    params.subjectName ?? "",
  );
  const group = getTemplateGroupForGrade(params.grade);
  const template =
    settings.grade_templates?.[group] ??
    buildSubjectTemplatePreset(params.subjectName ?? "", group);
  return {
    group,
    template: cloneTemplate(template),
    deadline: settings.deadline ?? "",
  };
}

export function getPrimaryOmrComponent(template: GradeTemplate) {
  return template.components.find((component) => component.type === "omr") ?? null;
}

export function computeMarkSummary(
  template: GradeTemplate,
  marksByKey: Record<string, number>,
): ComputedMarkSummary {
  const components = template.components.map((component) => {
    const mark = toNumber(marksByKey[component.key], 0);
    return {
      ...component,
      mark,
      effective_max_mark: component.max_mark,
    };
  });

  const rawTotal = components.reduce((sum, component) => sum + component.mark, 0);

  const computedMax = components.reduce((sum, component) => sum + component.effective_max_mark, 0);
  const totalMax = computedMax;
  const percentage = totalMax > 0 ? Math.round((rawTotal / totalMax) * 100) : 0;

  return {
    components,
    raw_total: rawTotal,
    total_max: totalMax,
    percentage,
  };
}

export function serializeTemplateForStorage(template: GradeTemplate) {
  return {
    group: template.group,
    label: template.label,
    normalization_total: template.normalization_total ?? null,
    components: template.components.map((component) => ({
      key: component.key,
      label: component.label,
      type: component.type,
      max_mark: component.max_mark,
      question_count: component.question_count ?? null,
      included_in_total: component.included_in_total !== false,
    })),
  };
}
