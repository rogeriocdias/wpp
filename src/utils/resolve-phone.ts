/*
 * This file is part of WPPConnect.
 *
 * WPPConnect is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * WPPConnect is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with WPPConnect.  If not, see <https://www.gnu.org/licenses/>.
 */

/* Helper to resolve a phone number from a chatId (handles @c.us, @s.whatsapp.net and @lid) */
const cache = new Map<string, string | null>();

export async function resolvePhoneFromChatId(
  client: any,
  chatId: string
): Promise<string | null> {
  if (!chatId || typeof chatId !== 'string') return null;

  // group or broadcast
  if (chatId === 'status@broadcast' || chatId.endsWith('@g.us')) return null;

  // LID handling: use client.getPnLidEntry if available
  if (chatId.endsWith('@lid')) {
    if (cache.has(chatId)) return cache.get(chatId) as string | null;

    if (!client || typeof client.getPnLidEntry !== 'function') {
      // fallback: return null when we can't resolve
      cache.set(chatId, null);
      return null;
    }

    try {
      const info = await client.getPnLidEntry(chatId);
      const phone = info?.phoneNumber || null;
      cache.set(chatId, phone);
      return phone;
    } catch (err) {
      cache.set(chatId, null);
      return null;
    }
  }

  // Standard JID formats like 5511999999999@c.us or @s.whatsapp.net
  if (chatId.includes('@')) {
    return chatId.split('@')[0] || null;
  }

  return null;
}

export function clearResolvePhoneCache() {
  cache.clear();
}

export function getResolvePhoneCacheSize() {
  return cache.size;
}
