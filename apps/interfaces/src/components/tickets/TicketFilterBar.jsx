export default function TicketFilterBar({
  timeRange,
  setTimeRange,
  selectedComponent,
  setSelectedComponent,
  selectedClient,
  setSelectedClient,
  selectedLocation,
  setSelectedLocation,
  selectedStatus,
  setSelectedStatus,
  selectedAssignee = "",
  setSelectedAssignee,
  teamMembers = [],
  components = [],
  clients = [],
  locations = [],
  statuses = ["Open", "Escalated", "Solved", "Closed"],
}) {
  const timeRanges = [
    { label: "30 hari", value: "30d" },
    { label: "90 hari", value: "90d" },
    { label: "6 bulan", value: "6m" },
    { label: "Semua", value: "all" },
  ];

  const selectStyle = {
    padding: "7px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontSize: "13px",
    fontWeight: 500,
    outline: "none",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
    transition: "border-color 0.15s ease",
  };

  const isFilterActive =
    Boolean(selectedComponent) ||
    Boolean(selectedClient) ||
    Boolean(selectedLocation) ||
    Boolean(selectedStatus) ||
    Boolean(selectedAssignee);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        marginBottom: "20px",
        alignItems: "flex-start",
      }}
    >
      {/* 1. Time Range Filter Box with its own padding */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "12px",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid var(--border-light)",
          padding: "8px 16px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#1e293b",
            fontSize: "13.5px",
            fontWeight: 650,
            marginRight: "4px",
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filter
        </div>

        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
          {timeRanges.map((item) => {
            const isActive = timeRange === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setTimeRange(item.value)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: isActive ? "#10212a" : "#e2e8f0",
                  backgroundColor: isActive ? "#10212a" : "#ffffff",
                  color: isActive ? "#ffffff" : "#475569",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
                  outline: "none",
                  transform: "none",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Dropdown Filters Box with its own separated padding underneath */}
      <div
        style={{
          width: "100%",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid var(--border-light)",
          padding: "12px 18px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {/* Component Filter */}
        <select
          value={selectedComponent}
          onChange={(e) => setSelectedComponent(e.target.value)}
          style={{ ...selectStyle, minWidth: "150px" }}
        >
          <option value="">Semua component</option>
          {components.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Client Filter */}
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          style={{ ...selectStyle, minWidth: "140px" }}
        >
          <option value="">Semua client</option>
          {clients.map((client) => (
            <option key={client} value={client}>
              {client}
            </option>
          ))}
        </select>

        {/* Location Filter */}
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          style={{ ...selectStyle, minWidth: "130px" }}
        >
          <option value="">Semua lokasi</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{ ...selectStyle, minWidth: "130px" }}
        >
          <option value="">Semua status</option>
          {statuses.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        {/* PIC / Tim Filter */}
        <select
          value={selectedAssignee}
          onChange={(e) => setSelectedAssignee && setSelectedAssignee(e.target.value)}
          style={{ ...selectStyle, minWidth: "150px" }}
        >
          <option value="">Semua PIC / Tim</option>
          <option value="unassigned">Belum Ditugaskan (Unassigned)</option>
          {teamMembers.map((member) => (
            <option key={member.id || member.name} value={member.name}>
              {member.name}
            </option>
          ))}
        </select>

        {/* Reset Filter Button if active */}
        {isFilterActive && (
          <button
            type="button"
            onClick={() => {
              setSelectedComponent("");
              setSelectedClient("");
              setSelectedLocation("");
              setSelectedStatus("");
              if (setSelectedAssignee) setSelectedAssignee("");
            }}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#f1f5f9",
              color: "#0e8587",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "background-color 0.15s ease",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset filter
          </button>
        )}
      </div>
    </div>
  );
}
