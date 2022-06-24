import "antd/dist/antd.css";
import Page from "../../../../../components/layout/Page";
import Container from "../../../../../components/layout/Container";
import { ChainProvider } from "../../../../../components/Context";
import TransactionView from "../../../../../components/data_view/TransactionView";

export default () => {
    return (
        <ChainProvider>
            <Page
                enableSelectChain={false}
            >
                <div
                    style={{
                        backgroundImage: `url(/images/background.png)`,
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: 'cover',
                        minHeight: '100vh'
                    }}
                >
                    <Container
                        option={2}
                        component={
                            <TransactionView />
                        }
                    />
                </div>
            </Page>
        </ChainProvider>
    )
}