/**
 * Broadcast - Router component untuk halaman broadcast
 *
 * Menentukan apakah pengguna sedang:
 * - Membuat kampanye baru (CampaignWizard)
 * - Menjalankan kampanye yang sudah ada (CampaignRunner)
 *
 * @module Broadcast
 */

import { useParams } from 'react-router-dom';
import CampaignWizard from './CampaignWizard';
import CampaignRunner from './CampaignRunner';

/**
 * Entry point untuk fitur broadcast
 * Jika ada parameter ID di URL, tampilkan CampaignRunner
 * Jika tidak ada ID, tampilkan CampaignWizard untuk membuat kampanye baru
 */
export default function Broadcast() {
  const { id } = useParams();

  // Jika ada ID kampanye di URL, jalankan kampanye tersebut
  if (id) return <CampaignRunner campaignId={id} />;

  // Jika tidak ada ID, tampilkan wizard untuk membuat kampanye baru
  return <CampaignWizard />;
}
