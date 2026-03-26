// Legacy backfill was retired after the structured case model became the
// single source of truth and the old Adolescente columns were removed.
console.error(
  [
    "O backfill de casos infracionais foi descontinuado.",
    "As colunas legadas do adolescente ja foram removidas do banco.",
    "Use os dados estruturados em adolescentes_casos_infracionais.",
  ].join(" "),
);
process.exit(1);
