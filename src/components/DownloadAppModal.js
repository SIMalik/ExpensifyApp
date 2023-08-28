import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {withOnyx} from 'react-native-onyx';
import _ from 'underscore';
import ONYXKEYS from '../ONYXKEYS';
import styles from '../styles/styles';
import CONST from '../CONST';
import AppIcon from '../../assets/images/expensify-app-icon.svg';
import useLocalize from '../hooks/useLocalize';
import * as Link from '../libs/actions/Link';
import * as Browser from '../libs/Browser';
import getOperatingSystem from '../libs/getOperatingSystem';
import setShowDownloadAppModal from '../libs/actions/DownloadAppModal';
import ConfirmModal from './ConfirmModal';

const propTypes = {
    /** ONYX PROP to hide banner for a user that has dismissed it */
    // eslint-disable-next-line react/forbid-prop-types
    showDownloadAppBanner: PropTypes.bool,

    /** Session of currently logged in user */
    session: PropTypes.shape({
        /** Currently logged in user authToken */
        authToken: PropTypes.string,
    }),
};

const defaultProps = {
    showDownloadAppBanner: true,
    session: {
        authToken: null,
    },
};

function DownloadAppModal({session, showDownloadAppBanner}) {
    const userLoggedIn = !_.isEmpty(session.authToken);
    console.log({userLoggedIn});
    const [shouldShowBanner, setshouldShowBanner] = useState((Browser.isMobile() || true) && userLoggedIn && showDownloadAppBanner);

    const {translate} = useLocalize();

    const handleCloseBanner = () => {
        setShowDownloadAppModal(false);
        setshouldShowBanner(false);
    };

    let link = '';

    if (getOperatingSystem() === CONST.OS.IOS) {
        link = CONST.APP_DOWNLOAD_LINKS.IOS;
    } else if (getOperatingSystem() === CONST.OS.ANDROID) {
        link = CONST.APP_DOWNLOAD_LINKS.ANDROID;
    }

    const handleOpenAppStore = () => {
        Link.openExternalLink(link, true);
    };

    return (
        <ConfirmModal
            title={translate('DownloadAppModal.downloadTheApp')}
            isVisible={shouldShowBanner}
            onConfirm={handleOpenAppStore}
            onCancel={handleCloseBanner}
            prompt={translate('DownloadAppModal.keepTheConversationGoing')}
            confirmText={translate('common.download')}
            cancelText={translate('DownloadAppModal.noThanks')}
            shouldCenterContent
            iconSource={AppIcon}
            promptStyles={[styles.textNormal, styles.lh20]}
            titleStyles={[styles.textHeadline]}
            iconAdditionalStyles={[styles.appIconBorderRadius]}
            shouldStackButtons={false}
        />
    );
}

DownloadAppModal.displayName = 'DownloadAppModal';
DownloadAppModal.propTypes = propTypes;
DownloadAppModal.defaultProps = defaultProps;

export default withOnyx({
    showDownloadAppBanner: {
        key: ONYXKEYS.SHOW_DOWNLOAD_APP_BANNER,
    },
    session: {
        key: ONYXKEYS.SESSION,
    },
})(DownloadAppModal);
