import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StatusBar, Text } from 'react-native';
import Animated, {
    LinearTransition,
    runOnJS,
    SharedValue,
    useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT } from '@/constants';
import { InboxListStateProvider, useInboxListStateContext } from '@/context';
import { useAppDispatch, useAppSelector } from '@/hooks';
import i18n from '@/i18n';
import { notificationActions } from '@/store/notification/notificationAction';
import { selectSortOrder } from '@/store/notification/notificationFilterSlice';
import {
    getFilteredNotifications,
    selectIsAllNotificationsFetched,
    selectIsLoadingNotifications,
} from '@/store/notification/notificationSelectors';
import { resetNotifications } from '@/store/notification/notificationSlice';
import { InboxSortTypes } from '@/store/notification/notificationTypes';
import { EmptyStateIcon } from '@/svg-icons';
import { tailwind } from '@/theme';
import type { Notification } from '@/types/Notification';
import { InboxHeader, InboxItemContainer } from './components';
import { CreateTicketModal } from './components/CreateTicketModal';

const AnimatedFlashlist = Animated.createAnimatedComponent(FlashList<Notification>);

const InboxList = () => {
  const [pageNumber, setPageNumber] = useState(1);

  const [isFlashListReady, setFlashListReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isNotificationsLoading = useAppSelector(selectIsLoadingNotifications);
  const isAllNotificationsFetched = useAppSelector(selectIsAllNotificationsFetched);
  const sortOrder = useAppSelector(selectSortOrder);

  const notifications = useAppSelector(state => getFilteredNotifications(state, sortOrder));

  const previousSortOrder = useRef(sortOrder);

  const dispatch = useAppDispatch();

  useEffect(() => {
    if (previousSortOrder.current !== sortOrder) {
      previousSortOrder.current = sortOrder;
      clearAndFetchNotifications(sortOrder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder]);

  // eslint-disable-next-line react/display-name
  const ListFooterComponent = React.memo(() => {
    if (isAllNotificationsFetched) return null;
    return (
      <Animated.View
        style={tailwind.style(
          'flex-1 items-center justify-center pt-8',
          `pb-[${TAB_BAR_HEIGHT}px]`,
        )}>
        {isAllNotificationsFetched ? null : <ActivityIndicator size="small" />}
      </Animated.View>
    );
  });

  useEffect(() => {
    clearAndFetchNotifications(sortOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAndFetchNotifications = useCallback(async (sortOrder: InboxSortTypes) => {
    setPageNumber(1);
    await dispatch(resetNotifications());
    fetchNotifications(sortOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchNotifications = useCallback(
    async (sortOrder: InboxSortTypes, page: number = 1) => {
      dispatch(notificationActions.fetchNotifications({ page, sort_order: sortOrder }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onChangePageNumber = () => {
    const nextPageNumber = pageNumber + 1;
    setPageNumber(nextPageNumber);
    fetchNotifications(sortOrder, nextPageNumber);
  };

  const handleOnEndReached = () => {
    const shouldLoadMoreConversations =
      isFlashListReady && !isAllNotificationsFetched && !isNotificationsLoading;
    if (shouldLoadMoreConversations) {
      onChangePageNumber();
    }
  };

  const handleRefresh = useCallback(() => {
    setFlashListReady(false);
    setIsRefreshing(true);
    clearAndFetchNotifications(sortOrder).finally(() => {
      setIsRefreshing(false);
    });
  }, [clearAndFetchNotifications, sortOrder]);

  const { openedRowIndex } = useInboxListStateContext();

  const handleRender: ListRenderItem<Notification> = ({ item, index }) => {
    return (
      <InboxItemContainer
        item={item}
        index={index}
        openedRowIndex={openedRowIndex as SharedValue<number | null>}
      />
    );
  };

  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => {
      openedRowIndex.value = -1;
      if (!isFlashListReady) {
        runOnJS(setFlashListReady)(true);
      }
    },
  });

  const shouldShowEmptyLoader = isNotificationsLoading && notifications.length === 0;

  return shouldShowEmptyLoader ? (
    <Animated.View
      style={tailwind.style('flex-1 items-center justify-center', `pb-[${TAB_BAR_HEIGHT}px]`)}>
      <ActivityIndicator />
    </Animated.View>
  ) : notifications.length === 0 ? (
    <Animated.ScrollView
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      contentContainerStyle={tailwind.style(
        'flex-1 items-center justify-center',
        `pb-[${TAB_BAR_HEIGHT}px]`,
      )}>
      <EmptyStateIcon />
      <Animated.Text style={tailwind.style('pt-6 text-md tracking-[0.32px] text-gray-800')}>
        {i18n.t('NOTIFICATION.EMPTY')}
      </Animated.Text>
    </Animated.ScrollView>
  ) : (
    <AnimatedFlashlist
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      layout={LinearTransition.springify().damping(18).stiffness(120)}
      showsVerticalScrollIndicator={false}
      data={notifications}
      estimatedItemSize={71}
      onScroll={scrollHandler}
      onEndReached={handleOnEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={ListFooterComponent}
      renderItem={handleRender}
      contentContainerStyle={tailwind.style(`pb-[${TAB_BAR_HEIGHT - 1}px]`)}
    />
  );
};

export const InboxScreen = () => {
  const dispatch = useAppDispatch();
  const createTicketModalRef = useRef<BottomSheetModal>(null);

  const handleMarkAllAsRead = useCallback(() => {
    dispatch(notificationActions.markAllAsRead());
  }, [dispatch]);

  const handleCreateTicket = () => {
    createTicketModalRef.current?.present();
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={tailwind.style('flex-1 bg-white')}>
      <StatusBar
        translucent
        backgroundColor={tailwind.color('bg-white')}
        barStyle={'dark-content'}
      />
      <InboxListStateProvider>
        <InboxHeader markAllAsRead={handleMarkAllAsRead} />
        <InboxList />
      </InboxListStateProvider>
      <Pressable
        onPress={handleCreateTicket}
        style={tailwind.style(
          'absolute right-4 w-14 h-14 bg-blue-600 rounded-full items-center justify-center shadow-lg',
          `bottom-[${TAB_BAR_HEIGHT + 24}px]`,
          'z-50'
        )}>
        <Text style={tailwind.style('text-white text-3xl pb-1')}>+</Text>
      </Pressable>
      <CreateTicketModal
        ref={createTicketModalRef}
        onClose={() => createTicketModalRef.current?.dismiss()}
      />
    </SafeAreaView>
  );
};

export default InboxScreen;
