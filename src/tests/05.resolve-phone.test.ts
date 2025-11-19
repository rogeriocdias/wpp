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

import * as assert from 'assert';
import {
  resolvePhoneFromChatId,
  clearResolvePhoneCache,
  getResolvePhoneCacheSize,
} from '../utils/resolve-phone';

describe('resolvePhoneFromChatId', function () {
  it('extracts number from @c.us', async function () {
    const clientMock = {} as any;
    const res = await resolvePhoneFromChatId(clientMock, '12345@c.us');
    assert.strictEqual(res, '12345');
  });

  it('returns null for group ids', async function () {
    const clientMock = {} as any;
    const res = await resolvePhoneFromChatId(clientMock, '00000-111111@g.us');
    assert.strictEqual(res, null);
  });

  it('resolves @lid using getPnLidEntry', async function () {
    let calls = 0;
    const clientMock = {
      getPnLidEntry: async (id: string) => {
        calls++;
        return { lid: id, phoneNumber: '5511999999999' };
      },
    } as any;

    clearResolvePhoneCache();
    const res = await resolvePhoneFromChatId(clientMock, '5511999999999@lid');
    assert.strictEqual(res, '5511999999999');
    assert.strictEqual(calls, 1);

    // second call should hit cache
    const res2 = await resolvePhoneFromChatId(clientMock, '5511999999999@lid');
    assert.strictEqual(res2, '5511999999999');
    assert.strictEqual(
      calls,
      1,
      'getPnLidEntry should be called once due to cache'
    );
    assert.strictEqual(getResolvePhoneCacheSize(), 1);
  });

  it('returns null when client has no getPnLidEntry', async function () {
    const clientMock = {} as any;
    clearResolvePhoneCache();
    const res = await resolvePhoneFromChatId(clientMock, '5511999999999@lid');
    assert.strictEqual(res, null);
  });
});
