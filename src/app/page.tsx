import Link from 'next/link'
import { 
  ArrowRight, 
  FileText, 
  Clock, 
  CheckCircle, 
  Users, 
  ShieldCheck, 
  Layers 
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-blue-100">

      {/* Hero section introducing the platform */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">

        <div className="container mx-auto px-6 text-center relative z-10">

          {/* Main headline and platform branding */}
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Research & <span className="text-blue-600">Thesis Tracking</span> System
          </h1>

          {/* Short description explaining the system purpose */}
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Submit, review, and monitor your research progress in one place. 
            Designed for students and advisers to collaborate, review revisions, and track approval status without paperwork.
          </p>

          {/* Primary call-to-action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">

            <Link 
              href="/login" 
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
            >
              Get Started <ArrowRight size={18} />
            </Link>

            <Link 
              href="#how-it-works" 
              className="w-full sm:w-auto px-8 py-4 bg-gray-100 text-gray-700 font-semibold rounded-full hover:bg-gray-200 transition-all"
            >
              View How It Works
            </Link>

          </div>

        </div>

        {/* Decorative radial gradient background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-50/50 via-transparent to-transparent -z-10" />
      </section>


      {/* Problem → Solution section explaining benefits */}
      <section className="py-20 bg-gray-50">

        <div className="container mx-auto px-6">

          {/* Section title */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why use this system?</h2>
            <div className="h-1.5 w-20 bg-blue-600 mx-auto rounded-full" />
          </div>

          {/* Feature cards describing the advantages */}
          <div className="grid md:grid-cols-3 gap-8">

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Layers size={24} />
              </div>

              <h3 className="text-xl font-bold mb-3">No more lost revisions</h3>
              <p className="text-gray-600">
                Every upload is stored and versioned. Never lose track of which file contains the latest changes.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6">
                <Clock size={24} />
              </div>

              <h3 className="text-xl font-bold mb-3">Faster feedback</h3>
              <p className="text-gray-600">
                Advisers comment directly on your files, reducing the wait time between submission and revision.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck size={24} />
              </div>

              <h3 className="text-xl font-bold mb-3">Clear progress tracking</h3>
              <p className="text-gray-600">
                Always know exactly where you stand. Real-time updates on approval status and requirements.
              </p>
            </div>

          </div>

        </div>

      </section>


      {/* Workflow explanation showing the research process */}
      <section id="how-it-works" className="py-20">

        <div className="container mx-auto px-6">

          {/* Workflow section heading */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">The Workflow</h2>
            <p className="text-gray-500">
              From proposal to final approval in five simple steps.
            </p>
          </div>

          {/* Workflow step icons */}
          <div className="flex flex-wrap justify-center gap-12">

            {[
              { icon: FileText, text: 'Create research entry' },
              { icon: Layers, text: 'Upload chapters' },
              { icon: Users, text: 'Receive adviser comments' },
              { icon: Clock, text: 'Revise & resubmit' },
              { icon: CheckCircle, text: 'Get approval' }
            ].map((step, i) => (

              <div key={i} className="flex flex-col items-center text-center max-w-[150px]">

                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 relative">
                  <step.icon size={28} />

                  {i < 4 && (
                    <div className="hidden lg:block absolute left-[100%] top-1/2 w-12 h-[2px] bg-gray-200" />
                  )}

                </div>

                <span className="text-sm font-semibold">{step.text}</span>

              </div>

            ))}

          </div>

        </div>

      </section>


      {/* Role-based explanation section */}
      <section className="py-20 bg-blue-900 text-white rounded-3xl mx-6 mb-20">

        <div className="container mx-auto px-6">

          <div className="grid md:grid-cols-3 gap-12 text-center">

            <div>
              <h4 className="text-2xl font-bold mb-4">For Students</h4>
              <p className="text-blue-100">
                Upload manuscripts, track revision history, and view panel feedback in real-time.
              </p>
            </div>

            <div>
              <h4 className="text-2xl font-bold mb-4">For Advisers</h4>
              <p className="text-blue-100">
                Efficiently review submissions, leave structured comments, and manage student loads.
              </p>
            </div>

            <div>
              <h4 className="text-2xl font-bold mb-4">For Admin</h4>
              <p className="text-blue-100">
                Monitor overall research metrics, manage user roles, and archive completed projects.
              </p>
            </div>

          </div>

        </div>

      </section>


      {/* Final call-to-action encouraging research submission */}
      <section className="pb-20 text-center">

        <div className="container mx-auto px-6">

          <h2 className="text-3xl font-bold mb-6">
            Ready to submit your research?
          </h2>

          <Link 
            href="/login" 
            className="inline-block px-10 py-4 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
          >
            Submit Research Now
          </Link>

        </div>

      </section>

    </div>
  )
}