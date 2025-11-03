import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/auth'
import { LoginForm } from './login-form'

export default async function LoginPage() {
  const session = await verifySession()
  
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Sistema CENSE Maringá
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sistema de Inteligência e Gestão Socioeducativa
          </p>
        </div>
        
        <LoginForm />
      </div>
    </div>
  )
}
