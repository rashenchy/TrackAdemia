'use client'

import { BarChart3, Users, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

export function TeacherAnalytics({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="grid gap-6">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6 flex items-center gap-2">
          <BarChart3 size={16} className="text-blue-600" /> Student Completion Ranking
        </h3>
        
        <div className="space-y-4">
          {data.map((student) => (
            <div key={student.student_id} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{student.student_name}</span>
                <span className="font-mono font-bold text-blue-600">{student.completion_rate}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden flex">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    student.completion_rate > 70 ? 'bg-green-500' : student.completion_rate > 30 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${student.completion_rate}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400">
                {student.completed_count} of {student.total_assigned} tasks finished
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}