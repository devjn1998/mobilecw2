import { BottomSheetBackdrop, BottomSheetWrapper, Button } from '@/components-next';
import { useAppSelector } from '@/hooks';
import { apiService } from '@/services/APIService';
import { selectAllInboxes } from '@/store/inbox/inboxSelectors';
import { CaretBottomSmall } from '@/svg-icons/common';
import { tailwind } from '@/theme';
import { showToast } from '@/utils/toastUtils';
import { BottomSheetModal, useBottomSheetSpringConfigs } from '@gorhom/bottom-sheet';
import { StackActions, useNavigation } from '@react-navigation/native';
import React, { forwardRef, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';


export const CreateTicketModal = forwardRef<BottomSheetModal, { onClose?: () => void }>(
  ({ onClose }, ref) => {
    const [phoneNumber, setPhoneNumber] = useState('+55');
    const [message, setMessage] = useState('');
    const [selectedInboxId, setSelectedInboxId] = useState<number | null>(null);
    const [isInboxListOpen, setIsInboxListOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const navigation = useNavigation();



    const inboxes = useAppSelector(selectAllInboxes);
    
    const selectedInbox = useMemo(() => 
        inboxes.find(i => i.id === selectedInboxId), 
        [inboxes, selectedInboxId]
    );

    const animationConfigs = useBottomSheetSpringConfigs({
      mass: 1,
      stiffness: 420,
      damping: 30,
    });

    const snapPoints = useMemo(() => ['85%'], []);

    const handleSubmit = async () => {
      if (!phoneNumber || !message || !selectedInboxId) {
        showToast({ message: 'Por favor preencha todos os campos.' });
        return;
      }

      setIsLoading(true);

      try {
        // 1. Search for contact
        const searchResponse = await apiService.get<{ payload: any[] }>(
             `contacts/search`,
             { params: { q: phoneNumber } }
        );
        const contacts = searchResponse.data.payload;

        let contactId;
        let sourceId;

        if (contacts && contacts.length > 0) {
          contactId = contacts[0].id;
          // Try to find the source_id for the selected inbox
          const contactInbox = contacts[0].contact_inboxes?.find(
            (ci: any) => ci.inbox.id === selectedInboxId
          );
          sourceId = contactInbox?.source_id;
        } else {
             // Create contact if not found logic could go here
             showToast({ message: 'Contato não encontrado com este número.' });
             setIsLoading(false);
             return;
        }
        
        const payload: any = {
           inbox_id: selectedInboxId,
           contact_id: contactId,
           message: {
               content: message
           },
           // assignee_id: 1 // Optional
        };

        if (sourceId) {
            payload.source_id = sourceId;
        }

        const response = await apiService.post<{ id: number; [key: string]: any }>(
            `conversations`,
            payload
        );

        showToast({ message: 'Chamado criado com sucesso!' });
        
        // Navigate to conversation
        const conversationData = response.data;
        if (conversationData && conversationData.id) {
            navigation.dispatch(
                StackActions.push('ChatScreen', {
                    conversationId: conversationData.id,
                })
            );
        }

        setPhoneNumber('+55');
        setMessage('');
        setSelectedInboxId(null);
        setIsInboxListOpen(false);
        // @ts-ignore
        ref?.current?.dismiss();
        onClose?.();

      } catch (error) {
        console.error('Error creating ticket:', error);
        // APIService usually handles toasts, but we can verify if we need one here
        // showToast({ message: 'Erro ao criar chamado.' }); 
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <BottomSheetModal
        ref={ref}
        backdropComponent={BottomSheetBackdrop}
        handleIndicatorStyle={tailwind.style('overflow-hidden bg-blackA-A6 w-8 h-1 rounded-[11px]')}
        handleStyle={tailwind.style('p-0 h-4 pt-[5px]')}
        style={tailwind.style('rounded-[26px] overflow-hidden')}
        animationConfigs={animationConfigs}
        enablePanDownToClose
        snapPoints={snapPoints}>
        <BottomSheetWrapper>
          <ScrollView contentContainerStyle={tailwind.style('p-4')}>
            <Text style={tailwind.style('text-lg font-bold mb-4 text-gray-900')}>Novo Chamado</Text>

            <View style={tailwind.style('mb-4')}>
              <Text style={tailwind.style('mb-1 text-sm font-medium text-gray-700')}>Para (Telefone/Email)</Text>
              <TextInput
                style={tailwind.style('border border-gray-300 rounded-lg p-3 bg-gray-50')}
                value={phoneNumber}
                onChangeText={(text) => {
                    // Simple mask to keep +55
                    if (!text.startsWith('+55')) {
                        setPhoneNumber('+55' + text.replace(/^\+55/, ''));
                    } else {
                        setPhoneNumber(text);
                    }
                }}
                keyboardType="phone-pad"
                placeholder="+55..."
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={tailwind.style('mb-4')}>
              <Text style={tailwind.style('mb-1 text-sm font-medium text-gray-700')}>Via (Caixa de Entrada)</Text>
              
              {/* Select Trigger */}
              <Pressable
                onPress={() => setIsInboxListOpen(!isInboxListOpen)}
                style={tailwind.style(
                    'border border-gray-300 rounded-lg p-3 bg-gray-50 flex-row justify-between items-center'
                )}
              >
                 <Text style={tailwind.style(selectedInbox ? 'text-gray-900' : 'text-gray-500')}>
                     {selectedInbox ? selectedInbox.name : 'Selecione uma caixa de entrada'}
                 </Text>
                 <View style={tailwind.style('w-4 h-4', { transform: [{ rotate: isInboxListOpen ? '180deg' : '0deg' }] })}>
                    <CaretBottomSmall stroke="#6B7280" />
                 </View>
              </Pressable>

              {/* Select Options */}
              {isInboxListOpen && (
                <View style={tailwind.style('border border-gray-300 rounded-lg bg-gray-50 overflow-hidden mt-2')}>
                    <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                        {inboxes.map((inbox) => (
                            <Pressable
                                key={inbox.id}
                                onPress={() => {
                                    setSelectedInboxId(inbox.id);
                                    setIsInboxListOpen(false);
                                }}
                                style={tailwind.style(
                                    'p-3 border-b border-gray-200 flex-row justify-between items-center active:bg-gray-100',
                                    selectedInboxId === inbox.id ? 'bg-blue-50' : ''
                                )}
                            >
                                <Text style={tailwind.style(
                                    'text-base',
                                    selectedInboxId === inbox.id ? 'text-blue-600 font-medium' : 'text-gray-900'
                                )}>
                                    {inbox.name}
                                </Text>
                                {selectedInboxId === inbox.id && (
                                    <View style={tailwind.style('w-2 h-2 rounded-full bg-blue-600')} />
                                )}
                            </Pressable>
                        ))}
                        {inboxes.length === 0 && (
                            <Text style={tailwind.style('p-3 text-gray-500 italic')}>
                                Nenhuma caixa de entrada disponível
                            </Text>
                        )}
                    </ScrollView>
                </View>
              )}
            </View>

            <View style={tailwind.style('mb-6')}>
              <Text style={tailwind.style('mb-1 text-sm font-medium text-gray-700')}>Mensagem</Text>
              <TextInput
                style={tailwind.style('border border-gray-300 rounded-lg p-3 h-32 bg-gray-50')}
                value={message}
                onChangeText={setMessage}
                multiline
                textAlignVertical="top"
                placeholder="Digite sua mensagem..."
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Button
              text={isLoading ? 'Enviando...' : 'Enviar'}
              handlePress={handleSubmit}
              disabled={isLoading}
            />
             {isLoading && <ActivityIndicator style={tailwind.style('mt-4')} />}
          </ScrollView>
        </BottomSheetWrapper>
      </BottomSheetModal>
    );
  },
);
