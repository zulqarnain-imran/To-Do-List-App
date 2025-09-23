"use client";

import { useState } from "react";

const TaskCard = ({ task, onUpdate, onDelete, onToggleComplete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description);

  const handleSave = () => {
    onUpdate(task.id, {
      title: editTitle,
      description: editDescription
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setEditDescription(task.description);
    setIsEditing(false);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-400";
      case "medium":
        return "bg-yellow-400";
      case "low":
        return "bg-green-400";
      default:
        return "bg-gray-400";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high":
        return "🔴";
      case "medium":
        return "🟡";
      case "low":
        return "🟢";
      default:
        return "⚪";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    return due < today && !task.completed;
  };

  return (
    <div className={`slide-in glass-card rounded-2xl p-6 transition-all duration-300 hover:shadow-xl ${
      task.completed ? "opacity-75" : ""
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Completion Toggle */}
          <button
            onClick={() => onToggleComplete(task.id)}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              task.completed
                ? "bg-green-400 border-green-400 text-white"
                : "border-gray-400 hover:border-green-400"
            }`}
          >
            {task.completed && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Priority Indicator */}
          <span className="text-lg" title={`${task.priority} priority`}>
            {getPriorityIcon(task.priority)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Edit task"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                title="Delete task"
              >
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                title="Save changes"
              >
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                title="Cancel editing"
              >
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Task Content */}
      <div className="space-y-3">
        {isEditing ? (
          <>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-gray-800 font-semibold focus:outline-none focus:border-white/50"
              placeholder="Task title..."
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-gray-600 resize-none focus:outline-none focus:border-white/50"
              placeholder="Task description..."
              rows={3}
            />
          </>
        ) : (
          <>
            <h3 className={`font-semibold text-gray-800 ${
              task.completed ? "line-through text-gray-500" : ""
            }`}>
              {task.title}
            </h3>
            {task.description && (
              <p className={`text-sm text-gray-600 ${
                task.completed ? "line-through text-gray-400" : ""
              }`}>
                {task.description}
              </p>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
        {/* Category */}
        {task.category && (
          <span className="px-3 py-1 bg-white/20 text-gray-700 text-xs font-medium rounded-full">
            {task.category}
          </span>
        )}

        {/* Due Date */}
        {task.dueDate && (
          <span className={`text-xs font-medium flex items-center gap-1 ${
            isOverdue(task.dueDate) ? "text-red-600" : "text-gray-600"
          }`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(task.dueDate)}
            {isOverdue(task.dueDate) && (
              <span className="text-red-500 ml-1">⚠️</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskCard;