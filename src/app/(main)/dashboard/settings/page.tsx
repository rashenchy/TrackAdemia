'use client'

import { Sun, Moon } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Appearance</h2>
        <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <p className="font-medium">Theme Mode</p>
            <p className="text-sm text-gray-500">Switch between light and dark display</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Sun size={18} /> Light
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white">
              <Moon size={18} /> Dark
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}