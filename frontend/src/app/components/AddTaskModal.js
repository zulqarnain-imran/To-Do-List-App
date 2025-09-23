"use client";

import { useState, useEffect } from "react";

const AddTaskModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    category: "",
    dueDate: ""
  });
  const [errors, setErrors] = useState({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        category: "",
        dueDate: ""
      });
      setErrors({});
    }
  }, [isOpen]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Task title is required";
    }

    if (formData.title.length > 100) {
      newErrors.title = "Title must be less than 100 characters";
    }

    if (formData.description.length > 500) {
      newErrors.description = "Description must be less than 500 characters";
    }

    if (formData.dueDate) {
      const selectedDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.dueDate = "Due date cannot be in the past";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onAdd(formData);
    }
  };

  const priorityOptions = [
    { value: "low", label: "Low Priority", color: "text-green-600", icon: "🟢" },
    { value: "medium", label: "Medium Priority", color: "text-yellow-600", icon: "🟡" },
    { value: "high", label: "High Priority", color: "text-red-600", icon: "🔴" }
  ];

  const categoryOptions = [
    "Work", "Personal", "Shopping", "Health", "Education", "Finance", "Travel", "Hobbies"
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative glass-card rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto slide-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Add New Task</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 bg-white/20 border rounded-xl placeholder-gray-500 text-gray-700 focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all ${
                errors.title ? "border-red-400" : "border-white/30"
              }`}
              placeholder="Enter task title..."
              maxLength={100}
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 bg-white/20 border rounded-xl placeholder-gray-500 text-gray-700 resize-none focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all ${
                errors.description ? "border-red-400" : "border-white/30"
              }`}
              placeholder="Enter task description..."
              rows={3}
              maxLength={500}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, priority: option.value }))}
                  className={`p-3 rounded-xl border transition-all text-sm font-medium ${
                    formData.priority === option.value
                      ? "bg-white/40 border-white/50 shadow-lg"
                      : "glass-button border-white/30"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg">{option.icon}</span>
                    <span className={option.color}>{option.label.split(" ")[0]}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Category and Due Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-gray-700 focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all"
              >
                <option value="">Select category</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category} className="bg-white">
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-white/20 border rounded-xl text-gray-700 focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all ${
                  errors.dueDate ? "border-red-400" : "border-white/30"
                }`}
                min={new Date().toISOString().split("T")[0]}
              />
              {errors.dueDate && (
                <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 glass-button rounded-xl text-gray-600 font-medium hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-400 to-yellow-400 text-white font-medium rounded-xl hover:from-orange-500 hover:to-yellow-500 transition-all transform hover:scale-105 shadow-lg"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;