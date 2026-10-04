// "House Committee on the Judiciary" -> "Judiciary (House)": the chamber prefix is noise in tables and lists.
export function committeeLabel(name) {
  const m = /^(House|Senate|Joint) Committee on (the )?(.*)$/.exec(name ?? "");
  return m ? `${m[3]} (${m[1]})` : name;
}

export const pct = (v) => `${Math.round(v)}%`;
