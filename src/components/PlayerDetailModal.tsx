import React from 'react';
import PlayerProfileModal from './PlayerProfileModal';

interface LegacyPlayerDetailModalProps {
  player: any | null;
  processedPlayers?: any[];
  onClose: () => void;
}

/**
 * Compatibility wrapper.
 *
 * The public Atlet page historically rendered this legacy two-tab modal.
 * Keep the old component API so existing imports continue to work, but route
 * every public athlete profile through the integrated five-tab experience.
 */
export const PlayerDetailModal: React.FC<LegacyPlayerDetailModalProps> = ({
  player,
  processedPlayers = [],
  onClose,
}) => {
  if (!player) return null;

  const rankIndex = processedPlayers.findIndex((item) => item?.id === player?.id);
  const globalRank = rankIndex >= 0 ? rankIndex + 1 : 0;
  const info = player?.pendaftaran || {};

  const normalizedPlayer = {
    id: String(player.id || info.id || player.name || 'player'),
    pendaftaran_id: String(player.pendaftaran_id || info.id || player.id || ''),
    player_name: String(player.name || info.nama || 'ATLET PB BILIBILI 162').trim().toUpperCase(),
    category: String(info.kategori_atlet || info.kategori || player.ageGroup || 'SENIOR'),
    seed: String(player.displaySeed || player.seed || 'UNSEEDED'),
    poin: Number(player.points || 0),
    total_points: Number(player.displayPoints ?? ((Number(player.points) || 0) + (Number(player.total_points) || 0))),
    bonus: Number(player.total_points || 0),
    photo_url: info.foto_url || player.img || undefined,
    updated_at: player.updated_at,
  };

  return (
    <PlayerProfileModal
      player={normalizedPlayer}
      globalRank={globalRank}
      onClose={onClose}
    />
  );
};

export default PlayerDetailModal;
