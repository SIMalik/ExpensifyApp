import React, {useMemo, useState} from 'react';
import type {StyleProp, TextStyle} from 'react-native';
import {View} from 'react-native';
import {useOnyx} from 'react-native-onyx';
import Button from '@components/Button';
import ButtonWithDropdownMenu from '@components/ButtonWithDropdownMenu';
import type {DropdownOption} from '@components/ButtonWithDropdownMenu/types';
import ConfirmModal from '@components/ConfirmModal';
import DecisionModal from '@components/DecisionModal';
import Header from '@components/Header';
import type HeaderWithBackButtonProps from '@components/HeaderWithBackButton/types';
import Icon from '@components/Icon';
import * as Expensicons from '@components/Icon/Expensicons';
import * as Illustrations from '@components/Icon/Illustrations';
import Text from '@components/Text';
import useActiveWorkspace from '@hooks/useActiveWorkspace';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {turnOffMobileSelectionMode} from '@libs/actions/MobileSelectionMode';
import * as SearchActions from '@libs/actions/Search';
import Navigation from '@libs/Navigation/Navigation';
import * as SearchUtils from '@libs/SearchUtils';
import SearchSelectedNarrow from '@pages/Search/SearchSelectedNarrow';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {SearchDataTypes} from '@src/types/onyx/SearchResults';
import type DeepValueOf from '@src/types/utils/DeepValueOf';
import type IconAsset from '@src/types/utils/IconAsset';
import {useSearchContext} from './SearchContext';
import type {SearchQueryJSON} from './types';

type HeaderWrapperProps = Pick<HeaderWithBackButtonProps, 'title' | 'subtitle' | 'icon' | 'children'> & {
    subtitleStyles?: StyleProp<TextStyle>;
};

function HeaderWrapper({icon, title, subtitle, children, subtitleStyles = {}}: HeaderWrapperProps) {
    const styles = useThemeStyles();

    // If the icon is present, the header bar should be taller and use different font.
    const isCentralPaneSettings = !!icon;

    const middleContent = useMemo(() => {
        return (
            <Header
                title={
                    <Text
                        style={[styles.mutedTextLabel, styles.pre]}
                        numberOfLines={1}
                    >
                        {title}
                    </Text>
                }
                subtitle={
                    <Text
                        numberOfLines={2}
                        style={[styles.textLarge, subtitleStyles]}
                    >
                        {subtitle}
                    </Text>
                }
            />
        );
    }, [styles.mutedTextLabel, styles.pre, styles.textLarge, subtitle, subtitleStyles, title]);

    return (
        <View
            dataSet={{dragArea: false}}
            style={[styles.headerBar, isCentralPaneSettings && styles.headerBarDesktopHeight]}
        >
            <View style={[styles.dFlex, styles.flexRow, styles.alignItemsCenter, styles.flexGrow1, styles.justifyContentBetween, styles.overflowHidden]}>
                {icon && (
                    <Icon
                        src={icon}
                        width={variables.iconHeader}
                        height={variables.iconHeader}
                        additionalStyles={[styles.mr2]}
                    />
                )}

                {middleContent}
                <View style={[styles.reportOptions, styles.flexRow, styles.pr5, styles.alignItemsCenter, styles.gap4]}>{children}</View>
            </View>
        </View>
    );
}

type SearchPageHeaderProps = {
    queryJSON: SearchQueryJSON;
    hash: number;
};

type SearchHeaderOptionValue = DeepValueOf<typeof CONST.SEARCH.BULK_ACTION_TYPES> | undefined;

type HeaderContent = {
    icon: IconAsset;
    titleText: TranslationPaths;
};

function getHeaderContent(type: SearchDataTypes): HeaderContent {
    switch (type) {
        case CONST.SEARCH.DATA_TYPES.INVOICE:
            return {icon: Illustrations.EnvelopeReceipt, titleText: 'workspace.common.invoices'};
        case CONST.SEARCH.DATA_TYPES.TRIP:
            return {icon: Illustrations.Luggage, titleText: 'travel.trips'};
        case CONST.SEARCH.DATA_TYPES.EXPENSE:
        default:
            return {icon: Illustrations.MoneyReceipts, titleText: 'common.expenses'};
    }
}

function SearchPageHeader({queryJSON, hash}: SearchPageHeaderProps) {
    const {translate} = useLocalize();
    const theme = useTheme();
    const styles = useThemeStyles();
    const {isOffline} = useNetwork();
    const {activeWorkspaceID} = useActiveWorkspace();
    const {shouldUseNarrowLayout, isSmallScreenWidth} = useResponsiveLayout();
    const {selectedTransactions, clearSelectedTransactions, selectedReports} = useSearchContext();
    const [selectionMode] = useOnyx(ONYXKEYS.MOBILE_SELECTION_MODE);
    const [deleteExpensesConfirmModalVisible, setDeleteExpensesConfirmModalVisible] = useState(false);
    const [offlineModalVisible, setOfflineModalVisible] = useState(false);
    const [downloadErrorModalVisible, setDownloadErrorModalVisible] = useState(false);

    const selectedTransactionsKeys = Object.keys(selectedTransactions ?? {});

    const {status, type} = queryJSON;
    const isCannedQuery = SearchUtils.isCannedSearchQuery(queryJSON);

    const headerSubtitle = isCannedQuery ? translate(getHeaderContent(type).titleText) : SearchUtils.getSearchHeaderTitle(queryJSON);
    const headerTitle = isCannedQuery ? '' : translate('search.filtersHeader');
    const headerIcon = isCannedQuery ? getHeaderContent(type).icon : Illustrations.Filters;

    const subtitleStyles = isCannedQuery ? styles.textHeadlineH2 : {};

    const handleDeleteExpenses = () => {
        if (selectedTransactionsKeys.length === 0) {
            return;
        }

        clearSelectedTransactions();
        setDeleteExpensesConfirmModalVisible(false);
        SearchActions.deleteMoneyRequestOnSearch(hash, selectedTransactionsKeys);
    };

    const headerButtonsOptions = useMemo(() => {
        if (selectedTransactionsKeys.length === 0) {
            return [];
        }

        const options: Array<DropdownOption<SearchHeaderOptionValue>> = [];

        options.push({
            icon: Expensicons.Download,
            text: translate('common.download'),
            value: CONST.SEARCH.BULK_ACTION_TYPES.EXPORT,
            shouldCloseModalOnSelect: true,
            onSelected: () => {
                if (isOffline) {
                    setOfflineModalVisible(true);
                    return;
                }

                const reportIDList = (selectedReports?.filter((report) => !!report) as string[]) ?? [];
                SearchActions.exportSearchItemsToCSV(
                    {query: status, jsonQuery: JSON.stringify(queryJSON), reportIDList, transactionIDList: selectedTransactionsKeys, policyIDs: [activeWorkspaceID ?? '']},
                    () => {
                        setDownloadErrorModalVisible(true);
                    },
                );
            },
        });

        const shouldShowHoldOption = !isOffline && selectedTransactionsKeys.every((id) => selectedTransactions[id].canHold);

        if (shouldShowHoldOption) {
            options.push({
                icon: Expensicons.Stopwatch,
                text: translate('search.bulkActions.hold'),
                value: CONST.SEARCH.BULK_ACTION_TYPES.HOLD,
                shouldCloseModalOnSelect: true,
                onSelected: () => {
                    if (isOffline) {
                        setOfflineModalVisible(true);
                        return;
                    }

                    if (selectionMode?.isEnabled) {
                        turnOffMobileSelectionMode();
                    }
                    Navigation.navigate(ROUTES.TRANSACTION_HOLD_REASON_RHP);
                },
            });
        }

        const shouldShowUnholdOption = !isOffline && selectedTransactionsKeys.every((id) => selectedTransactions[id].canUnhold);

        if (shouldShowUnholdOption) {
            options.push({
                icon: Expensicons.Stopwatch,
                text: translate('search.bulkActions.unhold'),
                value: CONST.SEARCH.BULK_ACTION_TYPES.UNHOLD,
                shouldCloseModalOnSelect: true,
                onSelected: () => {
                    if (isOffline) {
                        setOfflineModalVisible(true);
                        return;
                    }

                    clearSelectedTransactions();
                    if (selectionMode?.isEnabled) {
                        turnOffMobileSelectionMode();
                    }
                    SearchActions.unholdMoneyRequestOnSearch(hash, selectedTransactionsKeys);
                },
            });
        }

        const shouldShowDeleteOption = !isOffline && selectedTransactionsKeys.every((id) => selectedTransactions[id].canDelete);

        if (shouldShowDeleteOption) {
            options.push({
                icon: Expensicons.Trashcan,
                text: translate('search.bulkActions.delete'),
                value: CONST.SEARCH.BULK_ACTION_TYPES.DELETE,
                shouldCloseModalOnSelect: true,
                onSelected: () => {
                    if (isOffline) {
                        setOfflineModalVisible(true);
                        return;
                    }

                    setDeleteExpensesConfirmModalVisible(true);
                },
            });
        }

        if (options.length === 0) {
            const emptyOptionStyle = {
                interactive: false,
                iconFill: theme.icon,
                iconHeight: variables.iconSizeLarge,
                iconWidth: variables.iconSizeLarge,
                numberOfLinesTitle: 2,
                titleStyle: {...styles.colorMuted, ...styles.fontWeightNormal, ...styles.textWrap},
            };

            options.push({
                icon: Expensicons.Exclamation,
                text: translate('search.bulkActions.noOptionsAvailable'),
                value: undefined,
                ...emptyOptionStyle,
            });
        }

        return options;
    }, [
        queryJSON,
        status,
        selectedTransactionsKeys,
        selectedTransactions,
        translate,
        clearSelectedTransactions,
        hash,
        theme.icon,
        styles.colorMuted,
        styles.fontWeightNormal,
        isOffline,
        activeWorkspaceID,
        selectedReports,
        styles.textWrap,
        selectionMode?.isEnabled,
    ]);

    if (shouldUseNarrowLayout) {
        if (selectionMode?.isEnabled) {
            return (
                <SearchSelectedNarrow
                    options={headerButtonsOptions}
                    itemsLength={selectedTransactionsKeys.length}
                />
            );
        }
        return null;
    }

    return (
        <>
            <HeaderWrapper
                title={headerTitle}
                subtitle={headerSubtitle}
                icon={headerIcon}
                subtitleStyles={subtitleStyles}
            >
                {headerButtonsOptions.length > 0 && (
                    <ButtonWithDropdownMenu
                        onPress={() => null}
                        shouldAlwaysShowDropdownMenu
                        pressOnEnter
                        buttonSize={CONST.DROPDOWN_BUTTON_SIZE.MEDIUM}
                        customText={translate('workspace.common.selected', {selectedNumber: selectedTransactionsKeys.length})}
                        options={headerButtonsOptions}
                        isSplitButton={false}
                    />
                )}
                <Button
                    text={translate('search.filtersHeader')}
                    icon={Expensicons.Filters}
                    onPress={() => Navigation.navigate(ROUTES.SEARCH_ADVANCED_FILTERS)}
                    medium
                />
            </HeaderWrapper>
            <ConfirmModal
                isVisible={deleteExpensesConfirmModalVisible}
                onConfirm={handleDeleteExpenses}
                onCancel={() => {
                    setDeleteExpensesConfirmModalVisible(false);
                }}
                title={translate('iou.deleteExpense', {count: selectedTransactionsKeys.length})}
                prompt={translate('iou.deleteConfirmation', {count: selectedTransactionsKeys.length})}
                confirmText={translate('common.delete')}
                cancelText={translate('common.cancel')}
                danger
            />
            <DecisionModal
                title={translate('common.youAppearToBeOffline')}
                prompt={translate('common.offlinePrompt')}
                isSmallScreenWidth={isSmallScreenWidth}
                onSecondOptionSubmit={() => setOfflineModalVisible(false)}
                secondOptionText={translate('common.buttonConfirm')}
                isVisible={offlineModalVisible}
                onClose={() => setOfflineModalVisible(false)}
            />
            <DecisionModal
                title={translate('common.downloadFailedTitle')}
                prompt={translate('common.downloadFailedDescription')}
                isSmallScreenWidth={isSmallScreenWidth}
                onSecondOptionSubmit={() => setDownloadErrorModalVisible(false)}
                secondOptionText={translate('common.buttonConfirm')}
                isVisible={downloadErrorModalVisible}
                onClose={() => setDownloadErrorModalVisible(false)}
            />
        </>
    );
}

SearchPageHeader.displayName = 'SearchPageHeader';

export type {SearchHeaderOptionValue};
export default SearchPageHeader;
