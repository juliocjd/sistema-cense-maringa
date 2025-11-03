import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = await request.json()

    // Validação básica
    if (!email || !senha) {
      return NextResponse.json(
        { erro: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar operador
    const operador = await prisma.operador.findUnique({
      where: { email },
    })

    if (!operador) {
      return NextResponse.json(
        { erro: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, operador.senhaHash)

    if (!senhaValida) {
      return NextResponse.json(
        { erro: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Verificar status
    if (operador.status !== 'ATIVO') {
      return NextResponse.json(
        { erro: 'Usuário inativo' },
        { status: 403 }
      )
    }

    // Criar sessão
    await createSession(operador.id, operador.email, operador.funcaoRole)

    // Registrar no log
    await prisma.logAuditoria.create({
      data: {
        operadorId: operador.id,
        acao: 'LOGIN_SUCESSO',
        ipOrigem: request.headers.get('x-forwarded-for') || 'unknown',
      },
    })

    return NextResponse.json({
      operador: {
        id: operador.id,
        nome: operador.nomeCompleto,
        email: operador.email,
        role: operador.funcaoRole,
      },
    })
  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
