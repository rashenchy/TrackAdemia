import { JoinSectionForm } from '@/components/dashboard/JoinSectionForm'

export default function JoinSectionPage() {
  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Join a Class</h1>
        <p className="text-gray-500 mt-1">Connect with your teacher by entering a section code.</p>
      </div>
      <JoinSectionForm />
    </div>
  )
}