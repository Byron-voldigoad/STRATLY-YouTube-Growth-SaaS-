import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, BarChart, Calendar, Target } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg" />
            <span className="text-xl font-bold text-gray-900">Stratly</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
              Login
            </Link>
            <Link href="/signup">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Monthly YouTube
          <span className="text-blue-600"> Growth Plans</span>
        </h1>
        
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          Get a personalized growth strategy for your YouTube channel every month. 
          Data-driven insights, AI-powered recommendations, and actionable steps.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Link href="/signup">
            <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
              Learn More
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div id="features" className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <BarChart className="h-12 w-12 text-blue-600 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">YouTube Analytics</h3>
            <p className="text-gray-600">
              Import your real YouTube data for accurate, personalized insights.
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <Target className="h-12 w-12 text-blue-600 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Strategy</h3>
            <p className="text-gray-600">
              Get monthly growth plans with video ideas, titles, and scripts.
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <Calendar className="h-12 w-12 text-blue-600 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Content Calendar</h3>
            <p className="text-gray-600">
              Plan your videos with a smart editorial calendar.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}