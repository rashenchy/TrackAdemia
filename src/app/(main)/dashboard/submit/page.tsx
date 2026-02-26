import { ResearchSubmissionForm } from '@/components/dashboard/ResearchSubmissionForm'

export default function SubmitResearchPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Submit Research</h1>
        <p className="text-gray-500 mt-1">Provide your capstone or thesis details to start tracking.</p>
      </div>
      
      <ResearchSubmissionForm />
    </div>
  )
}