"use client";

const Header = ({ 
  searchTerm, 
  setSearchTerm, 
  filter, 
  setFilter, 
  onAddTask, 
  activeCount, 
  completedCount 
}) => {
  const filterOptions = [
    { key: "all", label: "All Tasks", count: activeCount + completedCount },
    { key: "active", label: "Active", count: activeCount },
    { key: "completed", label: "Completed", count: completedCount },
  ];

  return (
    <div className="fade-in">
      {/* Main Header */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Title and Stats */}
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              My Tasks
            </h1>
            <div className="flex gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                {activeCount} Active
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                {completedCount} Completed
              </span>
            </div>
          </div>

          {/* Add Task Button */}
          <button
            onClick={onAddTask}
            className="glass-button px-6 py-3 rounded-xl text-gray-700 font-medium flex items-center gap-2 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Task
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-10 bg-white/20 border border-white/30 rounded-xl placeholder-gray-500 text-gray-700 focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all"
            />
            <svg 
              className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setFilter(option.key)}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                  filter === option.key
                    ? "bg-white/40 text-gray-800 shadow-lg"
                    : "glass-button text-gray-600 hover:text-gray-800"
                }`}
              >
                {option.label}
                <span className="ml-2 text-xs bg-white/30 px-2 py-1 rounded-full">
                  {option.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;