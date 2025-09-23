"use client";

import { useState, useEffect } from "react";
import TodoApp from "./components/TodoApp";

export default function Home() {
  return (
    <div className="gradient-bg min-h-screen">
      <TodoApp />
    </div>
  );
}
