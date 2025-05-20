import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import Manager from './Manager';
import Accountant from './Accountant';
import Dispatcher from './Dispatcher';
import Driver from './Driver';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/manager/*" element={<Manager />} />
      <Route path="/accountant/*" element={<Accountant />} />
      <Route path="/dispatcher/*" element={<Dispatcher />} />
      <Route path="/driver/*" element={<Driver />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
