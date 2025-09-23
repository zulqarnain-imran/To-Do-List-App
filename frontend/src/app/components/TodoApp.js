"use client";

import { useState, useEffect } from "react";
import TaskCard from "./TaskCard";
import AddTaskModal from "./AddTaskModal";
import Header from "./Header";

const TodoApp = () => {
  const [tasks, setTasks] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filter, setFilter] = useState("all"); // all, active, completed
  const [searchTerm, setSearchTerm] = useState("");

  // Load tasks from localStorage on component mount
  useEffect(() => {
    const savedTasks = localStorage.getItem("todoTasks");
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, []);

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem("todoTasks", JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (taskData) => {
    const newTask = {
      id: Date.now(),
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority,
      category: taskData.category,
      dueDate: taskData.dueDate,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks([...tasks, newTask]);
    setIsAddModalOpen(false);
  };

  const updateTask = (taskId, updates) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  const deleteTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const toggleComplete = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  // Filter tasks based on current filter and search term
  const filteredTasks = tasks.filter(task => {
    const matchesFilter = 
      filter === "all" || 
      (filter === "active" && !task.completed) ||
      (filter === "completed" && task.completed);
    
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const completedCount = tasks.filter(task => task.completed).length;
  const activeCount = tasks.filter(task => !task.completed).length;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Header 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filter={filter}
          setFilter={setFilter}
          onAddTask={() => setIsAddModalOpen(true)}
          activeCount={activeCount}
          completedCount={completedCount}
        />

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onToggleComplete={toggleComplete}
            />
          ))}
          
          {/* Empty State */}
          {filteredTasks.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <div className="glass-card rounded-2xl p-8 text-center">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {tasks.length === 0 ? "No tasks yet" : "No matching tasks"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {tasks.length === 0 
                    ? "Create your first task to get started!"
                    : "Try adjusting your search or filter."}
                </p>
                {tasks.length === 0 && (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="glass-button px-6 py-3 rounded-xl text-gray-700 font-medium hover:text-gray-900"
                  >
                    Add First Task
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add Task Modal */}
        <AddTaskModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={addTask}
        />
      </div>
    </div>
  );
};

export default TodoApp;