import MemoFilters from '@/components/MemoFilters';
import MemoView from '@/components/MemoView';
import MobileHeader from '@/components/MobileHeader';
import PagedMemoList from '@/components/PagedMemoList';
import UserAvatar from '@/components/UserAvatar';
import useLoading from '@/hooks/useLoading';
import { useMemoFilterStore, useUserStore } from '@/store/v1';
import { RowStatus } from '@/types/proto/api/v1/common';
import type { Memo } from '@/types/proto/api/v1/memo_service';
import type { User } from '@/types/proto/api/v1/user_service';
import { useTranslate } from '@/utils/i18n';
import { Button } from '@usememos/mui';
import copy from 'copy-to-clipboard';
import dayjs from 'dayjs';
import { ExternalLinkIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useParams } from 'react-router-dom';

const UserProfile = () => {
  const t = useTranslate();
  const params = useParams();
  const userStore = useUserStore();
  const loadingState = useLoading();
  const [user, setUser] = useState<User>();
  const memoFilterStore = useMemoFilterStore();

  useEffect(() => {
    const username = params.username;
    if (!username) {
      throw new Error('username is required');
    }

    userStore
      .searchUsers(`username == "${username}"`)
      .then((users) => {
        if (users.length !== 1) {
          throw new Error('User not found');
        }
        const user = users[0];
        setUser(user);
        loadingState.setFinish();
      })
      .catch((_error) => {
        toast.error(t('message.user-not-found'));
      });
  }, [params.username]);

  const memoListFilter = useMemo(() => {
    if (!user) {
      return '';
    }

    const filters = [
      `creator == "${user.name}"`,
      `row_status == "NORMAL"`,
      'order_by_pinned == true',
    ];
    const contentSearch: string[] = [];
    const tagSearch: string[] = [];
    for (const filter of memoFilterStore.filters) {
      if (filter.factor === 'contentSearch') {
        contentSearch.push(`"${filter.value}"`);
      } else if (filter.factor === 'tagSearch') {
        tagSearch.push(`"${filter.value}"`);
      }
    }
    if (contentSearch.length > 0) {
      filters.push(`content_search == [${contentSearch.join(', ')}]`);
    }
    if (tagSearch.length > 0) {
      filters.push(`tag_search == [${tagSearch.join(', ')}]`);
    }
    return filters.join(' && ');
  }, [user, memoFilterStore.filters]);

  const handleCopyProfileLink = () => {
    if (!user) {
      return;
    }

    copy(`${window.location.origin}/u/${encodeURIComponent(user.username)}`);
    toast.success(t('message.copied'));
  };

  return (
    <section className="flex min-h-full w-full max-w-5xl flex-col items-center justify-start pb-8 sm:pt-3 md:pt-6">
      <MobileHeader />
      <div className="flex w-full flex-col items-center justify-start px-4 sm:px-6">
        {!loadingState.isLoading &&
          (user ? (
            <>
              <div className="my-4 flex w-full items-center justify-end gap-2">
                <Button variant="outlined" onClick={handleCopyProfileLink}>
                  {t('common.share')}
                  <ExternalLinkIcon className="ml-1 h-auto w-4 opacity-60" />
                </Button>
              </div>
              <div className="flex w-full flex-col items-start justify-start px-3 pt-4 pb-8">
                <UserAvatar
                  className="!w-16 !h-16 rounded-3xl drop-shadow"
                  avatarUrl={user?.avatarUrl}
                />
                <div className="mt-2 flex w-auto max-w-[calc(100%-6rem)] flex-col items-start justify-center">
                  <p className="w-full truncate font-medium text-3xl text-black leading-tight opacity-80 dark:text-gray-200">
                    {user.nickname || user.username}
                  </p>
                  <p className="line-clamp-6 w-full truncate whitespace-pre-wrap text-gray-500 leading-snug dark:text-gray-400">
                    {user.description}
                  </p>
                </div>
              </div>
              <MemoFilters />
              <PagedMemoList
                renderer={(memo: Memo) => (
                  <MemoView
                    key={`${memo.name}-${memo.displayTime}`}
                    memo={memo}
                    showVisibility
                    showPinned
                    compact
                  />
                )}
                listSort={(memos: Memo[]) =>
                  memos
                    .filter((memo) => memo.rowStatus === RowStatus.ACTIVE)
                    .sort((a, b) =>
                      memoFilterStore.orderByTimeAsc
                        ? dayjs(a.displayTime).unix() -
                          dayjs(b.displayTime).unix()
                        : dayjs(b.displayTime).unix() -
                          dayjs(a.displayTime).unix()
                    )
                    .sort((a, b) => Number(b.pinned) - Number(a.pinned))
                }
                filter={memoListFilter}
              />
            </>
          ) : (
            <p>Not found</p>
          ))}
      </div>
    </section>
  );
};

export default UserProfile;
