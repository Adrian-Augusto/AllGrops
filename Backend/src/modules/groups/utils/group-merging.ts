export function sortGroupsBySponsorship(groups: any[]) {
  const now = new Date();

  return groups.sort((a, b) => {
    // Get active sponsorships (not expired)
    const aSponsorship = a.subscriptions?.find(
      (s: any) => s.isActive && s.status === 'APPROVED' && s.expiresAt && new Date(s.expiresAt) > now
    );
    const bSponsorship = b.subscriptions?.find(
      (s: any) => s.isActive && s.status === 'APPROVED' && s.expiresAt && new Date(s.expiresAt) > now
    );

    // Sponsored first
    if (aSponsorship && !bSponsorship) return -1;
    if (!aSponsorship && bSponsorship) return 1;

    // If both sponsored, sort by expiresAt (earliest expiring first)
    if (aSponsorship && bSponsorship) {
      const aExpires = new Date(aSponsorship.expiresAt).getTime();
      const bExpires = new Date(bSponsorship.expiresAt).getTime();
      if (aExpires !== bExpires) return aExpires - bExpires;
    }

    // If both not sponsored or same expiration, sort by createdAt (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Mescla listas de grupos PATROCINADOS e GRATUITOS com padrão de ordenação:
 * 1. Todos os patrocinados ativos (ordenados por expiração)
 * 2. Depois os gratuitos (mais recentes primeiro)
 */
export function mergeGroupsByFeatureStatus(
  featured: any[],
  free: any[],
  pageSize: number,
  pageNumber: number
): { groups: any[]; total: number } {
  const startIndex = (pageNumber - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // Padrão: 3 PATROCINADOS : 1 GRATUITO
  const pattern = 3;
  const totalPositions = featured.length + free.length;

  // Pré-calcular quais posições serão GRATUITAS
  const freePositions = new Set<number>();
  let freeIndex = 0;

  for (let i = 0; i < totalPositions; i++) {
    if ((i + 1) % (pattern + 1) === 0) {
      freePositions.add(i);
      freeIndex++;
    }
  }

  // Montar lista mesclada
  const merged: any[] = [];
  let featuredIndex = 0;
  let freeIdx = 0;

  for (let i = 0; i < totalPositions; i++) {
    if (freePositions.has(i) && freeIdx < free.length) {
      merged.push(free[freeIdx]);
      freeIdx++;
    } else if (featuredIndex < featured.length) {
      merged.push(featured[featuredIndex]);
      featuredIndex++;
    } else if (freeIdx < free.length) {
      // Se acabou PATROCINADO, adicionar GRATUITO restante
      merged.push(free[freeIdx]);
      freeIdx++;
    }
  }

  // Aplicar paginação
  const paginatedGroups = merged.slice(startIndex, endIndex);

  return {
    groups: paginatedGroups,
    total: merged.length,
  };
}
