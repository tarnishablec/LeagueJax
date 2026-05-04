export function normalizeCdragonLocale(language: string | undefined): string {
  const normalized = (language ?? "").trim().toLowerCase().replace("-", "_");

  if (normalized.startsWith("zh")) {
    return "zh_cn";
  }
  if (normalized.startsWith("ja")) {
    return "ja_jp";
  }
  if (normalized.startsWith("ko")) {
    return "ko_kr";
  }
  if (normalized.startsWith("pt")) {
    return "pt_br";
  }
  if (normalized.startsWith("es_mx")) {
    return "es_mx";
  }
  if (normalized.startsWith("es")) {
    return "es_es";
  }
  if (normalized.startsWith("fr")) {
    return "fr_fr";
  }
  if (normalized.startsWith("de")) {
    return "de_de";
  }
  if (normalized.startsWith("it")) {
    return "it_it";
  }
  if (normalized.startsWith("pl")) {
    return "pl_pl";
  }
  if (normalized.startsWith("ru")) {
    return "ru_ru";
  }
  if (normalized.startsWith("tr")) {
    return "tr_tr";
  }

  return "en_us";
}
