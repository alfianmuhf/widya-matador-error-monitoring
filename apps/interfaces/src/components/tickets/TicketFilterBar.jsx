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
  components = [],
  clients = [],
  locations = [],
  statuses = ["Open", "Monitor", "Solved", "Closed"],
}) {
  const timeRanges = [
    { label: "30 hari", value: "30d" },
    { label: "90 hari", value: "90d" },
    { label: "6 bulan", value: "6m" },
    { label: "Semua", value: "all" },
  ];

  const selectStyle = {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid var(--border-light)",
    backgroundColor: "#ffffff",
    color: "var(--text-dark)",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    outline: "none",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
    transition: "border-color 0.15s ease",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        marginBottom: "20px",
      }}
    >
      {/* Time Range Pill Group */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          backgroundColor: "#ffffff",
          padding: "4px 6px",
          borderRadius: "10px",
          border: "1px solid var(--border-light)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        {/* Filter label icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 8px",
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filter
        </div>

        {timeRanges.map((item) => {
          const isActive = timeRange === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setTimeRange(item.value)}
              style={{
                padding: "6px 14px",
                borderRadius: "7px",
                border: "none",
                backgroundColor: isActive ? "var(--tab-active-bg)" : "transparent",
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                fontSize: "var(--text-sm)",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Dropdown Filters */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        {/* Component Filter */}
        <select
          value={selectedComponent}
          onChange={(e) => setSelectedComponent(e.target.value)}
          style={selectStyle}
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
          style={selectStyle}
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
          style={selectStyle}
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
          style={selectStyle}
        >
          <option value="">Semua status</option>
          {statuses.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        {/* Reset Filter if active */}
        {(selectedComponent || selectedClient || selectedLocation || selectedStatus || timeRange !== "6m") && (
          <button
            type="button"
            onClick={() => {
              setTimeRange("6m");
              setSelectedComponent("");
              setSelectedClient("");
              setSelectedLocation("");
              setSelectedStatus("");
            }}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "transparent",
              color: "var(--primary-teal)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reset filter
          </button>
        )}
      </div>
    </div>
  );
}
