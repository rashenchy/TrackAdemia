import { FileText, Clock, ExternalLink } from 'lucide-react'

export function SubmissionsTable({ submissions }: { submissions: any[] }) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-12 flex flex-col items-center justify-center text-gray-400 gap-3 bg-gray-50/50 dark:bg-gray-900/20">
        <FileText size={40} className="opacity-20" />
        <div className="text-center">
          <p className="font-medium text-gray-500">No research entries found</p>
          <p className="text-xs">Start by clicking "Submit Research" in the sidebar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-[var(--background)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-4">Research Title</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {submissions.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[240px]">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      Submitted {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="capitalize px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold tracking-wider">
                    {item.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium 
                    ${item.status === 'Approved' ? 'text-green-600' : 'text-amber-600'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${item.status === 'Approved' ? 'bg-green-600' : 'bg-amber-600'}`} />
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-blue-600 transition-all">
                    <ExternalLink size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}