import { BottomSheetBackdrop, BottomSheetWrapper } from '@/components-next';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectUser } from '@/store/auth/authSelectors';
import { selectConversationById } from '@/store/conversation/conversationSelectors';
import { kanbanActions } from '@/store/kanban/kanbanActions';
import { selectCurrentKanbanFunnel } from '@/store/kanban/kanbanSelectors';
import type { KanbanFunnel } from '@/store/kanban/kanbanTypes';
import { tailwind } from '@/theme';
import { showToast } from '@/utils/toastUtils';
import {
    BottomSheetModal,
    BottomSheetScrollView,
    useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

interface AssignToFunnelModalProps {
  conversationId: number;
  funnels: KanbanFunnel[];
}

export const AssignToFunnelModal = React.forwardRef<BottomSheetModal, AssignToFunnelModalProps>(
  ({ conversationId, funnels }, ref) => {
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const conversation = useAppSelector(state => selectConversationById(state, conversationId));
    const currentFunnel = useAppSelector(selectCurrentKanbanFunnel);
    const [selectedFunnelId, setSelectedFunnelId] = useState<number | null>(null);
    const [selectedStageKey, setSelectedStageKey] = useState<string | null>(null);

    const animationConfigs = useBottomSheetSpringConfigs({
      mass: 1,
      stiffness: 420,
      damping: 30,
    });

    // Carregar funnels se não houver
    useEffect(() => {
      if (funnels.length === 0) {
        dispatch(kanbanActions.getFunnels());
      }
    }, [dispatch, funnels.length]);

    // Quando selecionar um funil, carregar seus stages
    useEffect(() => {
      if (selectedFunnelId) {
        dispatch(kanbanActions.getFunnel(selectedFunnelId));
      }
    }, [dispatch, selectedFunnelId]);

    const filteredFunnels = useMemo(() => {
     if (!funnels || !user) return [];

     // Filtro unificado idêntico ao KanbanBoardsListScreen
     return funnels.filter(funnel => {
       
       // 1. Verifica se é membro do board
       const allocatedAgents = funnel.settings?.agents || [];
       const isMember = allocatedAgents.some((agent: any) => {
         const agentId = typeof agent === 'number' ? agent : agent.id;
         return agentId === user.id;
       });

       if (isMember) return true;

       // 2. Se não for membro, verifica se tem items (cards) atribuídos a ele
       if (!funnel.stages || !Array.isArray(funnel.stages)) return false;

       const hasAssignedItem = funnel.stages.some(stage => {
         if (!stage.items || !Array.isArray(stage.items)) return false;

         return stage.items.some(item => {
            // Verifica se o item está atribuído ao agente
            const isAssignedToAgent = item.assignees?.some(assignee => assignee.id === user.id);
            
            // Verifica se a CONVERSA vinculada ao item está atribuída ao agente
            const conversationAssigneeId = item.conversation?.assignee?.id || item.conversation?.meta?.assignee?.id;
            const isConversationAssigned = conversationAssigneeId === user.id;
            
            return isAssignedToAgent || isConversationAssigned;
         });
       });

       return hasAssignedItem;
     });
    }, [funnels, user]);

    const selectedFunnel = useMemo(() => {
      // Se o funil selecionado for o currentFunnel, usar ele (pode ter stages mais atualizados)
      if (currentFunnel?.id === selectedFunnelId) {
        return currentFunnel;
      }
      return filteredFunnels.find(f => f.id === selectedFunnelId);
    }, [filteredFunnels, selectedFunnelId, currentFunnel]);

    const availableStages = useMemo(() => {
      if (!selectedFunnel?.stages || !Array.isArray(selectedFunnel.stages)) return [];
      return selectedFunnel.stages.filter(stage => stage.stage_key);
    }, [selectedFunnel?.stages]);

    const handleAssign = useCallback(async () => {
      if (!selectedFunnelId || !selectedStageKey || !conversation) return;

      try {
        const conversationTitle = conversation.meta?.sender?.name || `Conversa #${conversation.id}`;

        await dispatch(
          kanbanActions.createKanbanItem({
            kanban_item: {
              funnel_id: selectedFunnelId.toString(),
              funnel_stage: selectedStageKey,
              position: 0,
              item_details: {
                title: conversationTitle,
                conversation_id: conversationId,
              },
            },
          }),
        ).unwrap();

        showToast({ message: 'Conversa atribuída ao funil com sucesso' });
        (ref as React.RefObject<BottomSheetModal>).current?.dismiss();

        // Resetar seleções
        setSelectedFunnelId(null);
        setSelectedStageKey(null);
      } catch (error: unknown) {
        showToast({
          message: error instanceof Error ? error.message : 'Erro ao atribuir conversa ao funil',
        });
      }
    }, [dispatch, selectedFunnelId, selectedStageKey, conversation, conversationId, ref]);

    return (
      <BottomSheetModal
        ref={ref}
        backdropComponent={BottomSheetBackdrop}
        handleIndicatorStyle={tailwind.style('bg-gray-300 w-12 h-1')}
        enablePanDownToClose
        animationConfigs={animationConfigs}
        snapPoints={['100%']}>
        <BottomSheetWrapper>
          <BottomSheetScrollView
            style={tailwind.style('flex-1')}
            contentContainerStyle={tailwind.style('px-4 py-2')}>
            <View style={tailwind.style('flex-1 flex-row justify-between items-center')}>
              <Text style={tailwind.style('text-xl font-inter-semibold-20 text-gray-950')}>
                Atribuir ao Funil
              </Text>
              {selectedFunnelId && selectedStageKey && (
                <View style={[tailwind.style('p-2 border-t border-gray-100 bg-white')]}>
                  <Pressable onPress={handleAssign} style={tailwind.style('items-center')}>
                    <Text style={tailwind.style('text-blue-600 text-base font-inter-medium-24')}>
                      Salvar
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
            <Text style={tailwind.style('pb-2 text-sm text-gray-600')}>
              Selecione o funil e a etapa para atribuir esta conversa
            </Text>

            {/* Seleção de Funil */}
            <View style={tailwind.style('mb-6')}>
              <Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950 mb-2')}>
                Selecione o Funil
              </Text>
              {filteredFunnels.length === 0 ? (
                <View style={tailwind.style('bg-gray-50 rounded-lg p-4 items-center')}>
                  <Text style={tailwind.style('text-sm text-gray-500')}>
                    Nenhum funil disponível
                  </Text>
                </View>
              ) : (
                <View style={tailwind.style('gap-2')}>
                  {filteredFunnels.map(funnel => (
                    <Pressable
                      key={funnel.id}
                      onPress={() => {
                        setSelectedFunnelId(funnel.id);
                        setSelectedStageKey(null);
                      }}
                      style={tailwind.style(
                        `bg-white rounded-lg p-4 border-2 ${
                          selectedFunnelId === funnel.id ? 'border-blue-500' : 'border-gray-200'
                        } active:bg-gray-50`,
                      )}>
                      <Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
                        {funnel.name}
                      </Text>
                      {funnel.description && (
                        <Text style={tailwind.style('text-sm text-gray-600 mt-1')}>
                          {funnel.description}
                        </Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Seleção de Etapa */}
            {selectedFunnelId && (
              <View style={tailwind.style('mb-4')}>
                <Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950 mb-2')}>
                  Selecione a Etapa
                </Text>
                {availableStages.length === 0 ? (
                  <View style={tailwind.style('bg-gray-50 rounded-lg p-4 items-center')}>
                    <Text style={tailwind.style('text-sm text-gray-500')}>
                      Carregando etapas...
                    </Text>
                  </View>
                ) : (
                  <View style={tailwind.style('gap-2')}>
                    {availableStages.map(stage => (
                      <Pressable
                        key={stage.id}
                        onPress={() => setSelectedStageKey(stage.stage_key!)}
                        style={tailwind.style(
                          `bg-white rounded-lg p-4 border-2 ${
                            selectedStageKey === stage.stage_key
                              ? 'border-blue-500'
                              : 'border-gray-200'
                          } active:bg-gray-50`,
                        )}>
                        <View style={tailwind.style('flex-row items-center')}>
                          <View
                            style={[
                              tailwind.style('w-4 h-4 rounded-full mr-3'),
                              { backgroundColor: stage.color || '#3B82F6' },
                            ]}
                          />
                          <View style={tailwind.style('flex-1')}>
                            <Text
                              style={tailwind.style(
                                'text-base font-inter-medium-24 text-gray-950',
                              )}>
                              {stage.name}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}
          </BottomSheetScrollView>
          {/* Botão de Confirmar */}
        </BottomSheetWrapper>
      </BottomSheetModal>
    );
  },
);

AssignToFunnelModal.displayName = 'AssignToFunnelModal';
