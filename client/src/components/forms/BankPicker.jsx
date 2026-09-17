import React from "react";
import { SearchableSelect } from "./SearchableSelect";

/**
 * Searchable bank-account picker for "bank-transfer" payment flows. Stores the chosen
 * BankDetail's _id so the server can route the movement through the shared bank ledger.
 */
export function BankPicker({ banks = [], value, onChange, placeholder = "Search bank accounts...", style, allowClear = true }) {
  const options = React.useMemo(
    () =>
      banks.map((b) => ({
        value: b._id || b.id,
        label: `${b.bankName}${b.accountName ? " — " + b.accountName : ""} · ${b.accountNumber}`
      })),
    [banks]
  );

  return (
    <SearchableSelect
      value={value || ""}
      onChange={onChange}
      options={options}
      placeholder={banks.length ? placeholder : "No bank accounts available"}
      emptyOption={{ value: "", label: "Select a bank account" }}
      allowClear={allowClear}
      disabled={banks.length === 0}
      style={style}
    />
  );
}
