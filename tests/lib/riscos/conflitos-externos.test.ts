/**
 * Testes para lógica de conflitos externos com prioridade de facção
 *
 * Regras de negócio:
 * 1. Mesma Facção → ALIADOS (ignora conflito de bairro)
 * 2. Facções Diferentes e Conflitantes → RIVAIS
 * 3. Sem Facção + Bairros Conflitantes → RIVAIS
 * 4. Hierarquia: Facção > Bairro
 */

import { describe, it, expect } from 'vitest';

// Tipos simplificados para teste
type AdolescenteTest = {
  id: string;
  nomeCompleto: string;
  faccaoGrupoId: string | null;
  bairroOrigemId: string | null;
};

// Funções que vamos implementar
const saoAliadosPorFaccao = (
  adolescente1: AdolescenteTest,
  adolescente2: AdolescenteTest
): boolean => {
  if (!adolescente1.faccaoGrupoId || !adolescente2.faccaoGrupoId) {
    return false;
  }
  return adolescente1.faccaoGrupoId === adolescente2.faccaoGrupoId;
};

const saoRivaisPorFaccao = (
  adolescente: AdolescenteTest,
  faccaoRivalId: string
): boolean => {
  if (!adolescente.faccaoGrupoId) {
    return false;
  }
  return adolescente.faccaoGrupoId === faccaoRivalId;
};

const devemSerConsideradosRivaisPorBairro = (
  adolescente1: AdolescenteTest,
  adolescente2: AdolescenteTest,
  bairro1: string,
  bairro2Conflitante: string
): boolean => {
  // Só considera rival por bairro se NENHUM tem facção
  if (adolescente1.faccaoGrupoId || adolescente2.faccaoGrupoId) {
    return false; // Tem facção, bairro não importa
  }

  return (
    adolescente1.bairroOrigemId === bairro1 &&
    adolescente2.bairroOrigemId === bairro2Conflitante
  );
};

describe('Conflitos Externos - Prioridade de Facção', () => {

  describe('saoAliadosPorFaccao', () => {
    it('deve retornar true quando ambos pertencem à mesma facção', () => {
      const adolescente1: AdolescenteTest = {
        id: '1',
        nomeCompleto: 'João',
        faccaoGrupoId: 'faccao-pcc',
        bairroOrigemId: 'bairro-a'
      };

      const adolescente2: AdolescenteTest = {
        id: '2',
        nomeCompleto: 'Pedro',
        faccaoGrupoId: 'faccao-pcc',
        bairroOrigemId: 'bairro-b'
      };

      expect(saoAliadosPorFaccao(adolescente1, adolescente2)).toBe(true);
    });

    it('deve retornar false quando pertencem a facções diferentes', () => {
      const adolescente1: AdolescenteTest = {
        id: '1',
        nomeCompleto: 'João',
        faccaoGrupoId: 'faccao-pcc',
        bairroOrigemId: 'bairro-a'
      };

      const adolescente2: AdolescenteTest = {
        id: '2',
        nomeCompleto: 'Carlos',
        faccaoGrupoId: 'faccao-cv',
        bairroOrigemId: 'bairro-a'
      };

      expect(saoAliadosPorFaccao(adolescente1, adolescente2)).toBe(false);
    });

    it('deve retornar false quando um não tem facção', () => {
      const adolescente1: AdolescenteTest = {
        id: '1',
        nomeCompleto: 'João',
        faccaoGrupoId: 'faccao-pcc',
        bairroOrigemId: 'bairro-a'
      };

      const adolescente2: AdolescenteTest = {
        id: '2',
        nomeCompleto: 'Maria',
        faccaoGrupoId: null,
        bairroOrigemId: 'bairro-a'
      };

      expect(saoAliadosPorFaccao(adolescente1, adolescente2)).toBe(false);
    });

    it('deve retornar false quando nenhum tem facção', () => {
      const adolescente1: AdolescenteTest = {
        id: '1',
        nomeCompleto: 'João',
        faccaoGrupoId: null,
        bairroOrigemId: 'bairro-a'
      };

      const adolescente2: AdolescenteTest = {
        id: '2',
        nomeCompleto: 'Maria',
        faccaoGrupoId: null,
        bairroOrigemId: 'bairro-a'
      };

      expect(saoAliadosPorFaccao(adolescente1, adolescente2)).toBe(false);
    });
  });

  describe('saoRivaisPorFaccao', () => {
    it('deve retornar true quando adolescente pertence à facção rival', () => {
      const adolescente: AdolescenteTest = {
        id: '1',
        nomeCompleto: 'João',
        faccaoGrupoId: 'faccao-cv',
        bairroOrigemId: 'bairro-a'
      };

      expect(saoRivaisPorFaccao(adolescente, 'faccao-cv')).toBe(true);
    });

    it('deve retornar false quando adolescente não pertence à facção rival', () => {
      const adolescente: AdolescenteTest = {
        id: '1',
        nomeCompleto: 'João',
        faccaoGrupoId: 'faccao-pcc',
        bairroOrigemId: 'bairro-a'
      };

      expect(saoRivaisPorFaccao(adolescente, 'faccao-cv')).toBe(false);
    });

    it('deve retornar false quando adolescente não tem facção', () => {
      const adolescente: AdolescenteTest = {
        id: '1',
        nomeCompleto: 'João',
        faccaoGrupoId: null,
        bairroOrigemId: 'bairro-a'
      };

      expect(saoRivaisPorFaccao(adolescente, 'faccao-cv')).toBe(false);
    });
  });

  describe('devemSerConsideradosRivaisPorBairro', () => {
    it('deve retornar true quando nenhum tem facção e bairros estão em conflito', () => {
      const adolescente1: AdolescenteTest = {
        id: '1',
        nomeCompleto: 'João',
        faccaoGrupoId: null,
        bairroOrigemId: 'bairro-requiao'
      };

      const adolescente2: AdolescenteTest = {
        id: '2',
        nomeCompleto: 'Maria',
        faccaoGrupoId: null,
        bairroOrigemId: 'bairro-santa-felicidade'
      };

      expect(devemSerConsideradosRivaisPorBairro(
        adolescente1,
        adolescente2,
        'bairro-requiao',
        'bairro-santa-felicidade'
      )).toBe(true);
    });

    it('deve retornar false quando um tem facção, mesmo com bairros em conflito', () => {
      const adolescente1: AdolescenteTest = {
        id: '1',
        nomeCompleto: 'João',
        faccaoGrupoId: 'faccao-pcc',
        bairroOrigemId: 'bairro-requiao'
      };

      const adolescente2: AdolescenteTest = {
        id: '2',
        nomeCompleto: 'Maria',
        faccaoGrupoId: null,
        bairroOrigemId: 'bairro-santa-felicidade'
      };

      expect(devemSerConsideradosRivaisPorBairro(
        adolescente1,
        adolescente2,
        'bairro-requiao',
        'bairro-santa-felicidade'
      )).toBe(false);
    });

    it('deve retornar false quando ambos têm facção, mesmo com bairros em conflito', () => {
      const adolescente1: AdolescenteTest = {
        id: '1',
        nomeCompleto: 'João',
        faccaoGrupoId: 'faccao-pcc',
        bairroOrigemId: 'bairro-requiao'
      };

      const adolescente2: AdolescenteTest = {
        id: '2',
        nomeCompleto: 'Pedro',
        faccaoGrupoId: 'faccao-pcc',
        bairroOrigemId: 'bairro-santa-felicidade'
      };

      expect(devemSerConsideradosRivaisPorBairro(
        adolescente1,
        adolescente2,
        'bairro-requiao',
        'bairro-santa-felicidade'
      )).toBe(false);
    });
  });

  describe('Cenários Complexos de Negócio', () => {
    it('CENÁRIO 1: Mesma facção, bairros conflitantes → ALIADOS', () => {
      const adolescenteA: AdolescenteTest = {
        id: 'a',
        nomeCompleto: 'Adolescente A',
        faccaoGrupoId: 'faccao-pcc',
        bairroOrigemId: 'bairro-requiao'
      };

      const adolescenteB: AdolescenteTest = {
        id: 'b',
        nomeCompleto: 'Adolescente B',
        faccaoGrupoId: 'faccao-pcc',
        bairroOrigemId: 'bairro-santa-felicidade'
      };

      // Devem ser aliados pela facção
      expect(saoAliadosPorFaccao(adolescenteA, adolescenteB)).toBe(true);

      // NÃO devem ser rivais por bairro
      expect(devemSerConsideradosRivaisPorBairro(
        adolescenteA,
        adolescenteB,
        'bairro-requiao',
        'bairro-santa-felicidade'
      )).toBe(false);
    });

    it('CENÁRIO 2: Facções diferentes conflitantes → RIVAIS', () => {
      const adolescenteA: AdolescenteTest = {
        id: 'a',
        nomeCompleto: 'Adolescente A',
        faccaoGrupoId: 'faccao-pcc',
        bairroOrigemId: 'bairro-requiao'
      };

      const adolescenteB: AdolescenteTest = {
        id: 'b',
        nomeCompleto: 'Adolescente B',
        faccaoGrupoId: 'faccao-cv',
        bairroOrigemId: 'bairro-requiao' // Mesmo bairro!
      };

      // NÃO devem ser aliados
      expect(saoAliadosPorFaccao(adolescenteA, adolescenteB)).toBe(false);

      // Devem ser rivais pela facção (mesmo bairro não importa)
      expect(saoRivaisPorFaccao(adolescenteB, 'faccao-cv')).toBe(true);
    });

    it('CENÁRIO 3: Sem facção, bairros conflitantes → RIVAIS', () => {
      const adolescenteA: AdolescenteTest = {
        id: 'a',
        nomeCompleto: 'Adolescente A',
        faccaoGrupoId: null,
        bairroOrigemId: 'bairro-requiao'
      };

      const adolescenteB: AdolescenteTest = {
        id: 'b',
        nomeCompleto: 'Adolescente B',
        faccaoGrupoId: null,
        bairroOrigemId: 'bairro-santa-felicidade'
      };

      // NÃO são aliados por facção (não têm)
      expect(saoAliadosPorFaccao(adolescenteA, adolescenteB)).toBe(false);

      // SÃO rivais por bairro
      expect(devemSerConsideradosRivaisPorBairro(
        adolescenteA,
        adolescenteB,
        'bairro-requiao',
        'bairro-santa-felicidade'
      )).toBe(true);
    });

    it('CENÁRIO 4: Um com facção, outro sem, bairros conflitantes → NÃO RIVAIS por bairro', () => {
      const adolescenteA: AdolescenteTest = {
        id: 'a',
        nomeCompleto: 'Adolescente A',
        faccaoGrupoId: 'faccao-pcc',
        bairroOrigemId: 'bairro-requiao'
      };

      const adolescenteB: AdolescenteTest = {
        id: 'b',
        nomeCompleto: 'Adolescente B',
        faccaoGrupoId: null,
        bairroOrigemId: 'bairro-santa-felicidade'
      };

      // NÃO são aliados por facção
      expect(saoAliadosPorFaccao(adolescenteA, adolescenteB)).toBe(false);

      // NÃO são rivais por bairro (um tem facção)
      expect(devemSerConsideradosRivaisPorBairro(
        adolescenteA,
        adolescenteB,
        'bairro-requiao',
        'bairro-santa-felicidade'
      )).toBe(false);
    });
  });
});
